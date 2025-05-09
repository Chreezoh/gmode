import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { addCredits, CreditTransactionType } from '../billing/creditDeduction';
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
} from '../config/env';

// Subscription status types
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
}

// Create a function to get the Stripe client
export function getStripeClient(): Stripe | null {
  try {
    return new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use the latest API version
    });
  } catch (error) {
    console.error('Error initializing Stripe client:', error);
    return null;
  }
}

// Create a function to get the Supabase client
export function getSupabaseClient(): ReturnType<typeof createClient<Database>> | null {
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
}

// For testing purposes
export let _stripeClientForTesting: Stripe | null = null;
export let _supabaseClientForTesting: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Credit package interface
 */
export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
  recurring_interval?: string | null;
}

/**
 * Subscription interface
 */
export interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  productName: string;
  productDescription?: string;
  amount: number;
  currency: string;
  interval?: string;
  creditsPerRenewal: number;
}

/**
 * Create a Stripe checkout session for purchasing credits
 * @param userId The user ID
 * @param priceId The Stripe price ID
 * @param successUrl The URL to redirect to on successful payment
 * @param cancelUrl The URL to redirect to if the user cancels
 * @returns The checkout session URL
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null; sessionId: string | null; error?: any }> {
  try {
    // Get clients
    const stripe = _stripeClientForTesting || getStripeClient();
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!stripe || !supabase) {
      return { url: null, sessionId: null, error: new Error('Services not initialized') };
    }

    // Get the price details
    const { data: priceData, error: priceError } = await supabase
      .from('stripe_prices')
      .select('*, stripe_products(*)')
      .eq('stripe_price_id', priceId)
      .single();

    if (priceError || !priceData) {
      console.error('Error fetching price:', priceError);
      return { url: null, sessionId: null, error: priceError || new Error('Price not found') };
    }

    // Get or create a Stripe customer for this user
    const { stripeCustomerId, error: customerError } = await getOrCreateStripeCustomer(userId);

    if (customerError || !stripeCustomerId) {
      return { url: null, sessionId: null, error: customerError };
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: priceData.recurring_interval ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        credits: priceData.credits_amount.toString(),
        priceId,
      },
    });

    return { url: session.url, sessionId: session.id };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { url: null, sessionId: null, error };
  }
}

/**
 * Get or create a Stripe customer for a user
 * @param userId The user ID
 * @returns The Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  userId: string
): Promise<{ stripeCustomerId: string | null; error?: any }> {
  try {
    // Get clients
    const stripe = _stripeClientForTesting || getStripeClient();
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!stripe || !supabase) {
      return { stripeCustomerId: null, error: new Error('Services not initialized') };
    }

    // Get user details
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      console.error('Error fetching user:', userError);
      return { stripeCustomerId: null, error: userError || new Error('User not found') };
    }

    const user = userData.user;

    // Check if user already has a Stripe customer ID
    if (user.user_metadata?.stripe_customer_id) {
      return { stripeCustomerId: user.user_metadata.stripe_customer_id };
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      metadata: {
        userId,
      },
    });

    // Update user metadata with Stripe customer ID
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        stripe_customer_id: customer.id,
      },
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return { stripeCustomerId: customer.id, error: updateError };
    }

    return { stripeCustomerId: customer.id };
  } catch (error) {
    console.error('Error getting or creating Stripe customer:', error);
    return { stripeCustomerId: null, error };
  }
}

/**
 * Handle a successful payment
 * @param event The Stripe event
 * @returns Result of the operation
 */
export async function handleSuccessfulPayment(
  event: Stripe.Event
): Promise<{ success: boolean; error?: any }> {
  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits, priceId } = session.metadata || {};

    if (!userId || !credits) {
      return { success: false, error: new Error('Missing metadata in session') };
    }

    // Get clients
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!supabase) {
      return { success: false, error: new Error('Supabase client not initialized') };
    }

    // Add credits to the user's balance
    const creditsAmount = parseInt(credits, 10);
    const result = await addCredits(
      userId,
      creditsAmount,
      `Credit purchase via Stripe (${creditsAmount} credits)`,
      CreditTransactionType.ADDITION,
      session.id
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Record the payment in the payment history
    const { error: paymentError } = await supabase.from('stripe_payment_history').insert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      credits_amount: creditsAmount,
      status: 'completed',
    });

    if (paymentError) {
      console.error('Error recording payment history:', paymentError);
      return { success: false, error: paymentError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling successful payment:', error);
    return { success: false, error };
  }
}

/**
 * Get available credit packages
 * @returns List of credit packages
 */
export async function getAvailableCreditPackages(): Promise<{
  packages: CreditPackage[];
  error?: any;
}> {
  try {
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!supabase) {
      return { packages: [], error: new Error('Supabase client not initialized') };
    }

    const { data, error } = await supabase
      .from('stripe_prices')
      .select('*, stripe_products(*)')
      .eq('active', true)
      .order('unit_amount', { ascending: true });

    if (error) {
      console.error('Error fetching credit packages:', error);
      return { packages: [], error };
    }

    const packages: CreditPackage[] = data.map((price) => ({
      id: price.id,
      name: price.stripe_products?.name || 'Credit Package',
      description: price.stripe_products?.description || '',
      credits: price.credits_amount,
      price: price.unit_amount / 100, // Convert from cents to dollars
      currency: price.currency,
      stripePriceId: price.stripe_price_id,
      recurring_interval: price.recurring_interval,
    }));

    return { packages };
  } catch (error) {
    console.error('Error getting credit packages:', error);
    return { packages: [], error };
  }
}

/**
 * Create a subscription for a user
 * @param userId The user ID
 * @param priceId The Stripe price ID
 * @returns Result of the operation
 */
export async function createSubscription(
  userId: string,
  priceId: string
): Promise<{ subscriptionId: string | null; error?: any }> {
  try {
    // Get clients
    const stripe = _stripeClientForTesting || getStripeClient();
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!stripe || !supabase) {
      return { subscriptionId: null, error: new Error('Services not initialized') };
    }

    // Get the price details
    const { data: priceData, error: priceError } = await supabase
      .from('stripe_prices')
      .select('*, stripe_products(*)')
      .eq('stripe_price_id', priceId)
      .single();

    if (priceError || !priceData) {
      console.error('Error fetching price:', priceError);
      return { subscriptionId: null, error: priceError || new Error('Price not found') };
    }

    // Check if this is a recurring price
    if (!priceData.recurring_interval) {
      return { subscriptionId: null, error: new Error('Price is not a subscription') };
    }

    // Get or create a Stripe customer for this user
    const { stripeCustomerId, error: customerError } = await getOrCreateStripeCustomer(userId);

    if (customerError || !stripeCustomerId) {
      return { subscriptionId: null, error: customerError };
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
        },
      ],
      metadata: {
        userId,
        credits: priceData.credits_amount.toString(),
        priceId,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Store the subscription in the database
    const { error: insertError } = await supabase.from('stripe_subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    if (insertError) {
      console.error('Error storing subscription:', insertError);
      // Consider canceling the subscription in Stripe if we can't store it
      return { subscriptionId: subscription.id, error: insertError };
    }

    // If the subscription is active, add the initial credits
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      const creditsAmount = parseInt(priceData.credits_amount.toString(), 10);
      await addCredits(
        userId,
        creditsAmount,
        `Initial subscription credits (${creditsAmount} credits)`,
        CreditTransactionType.ADDITION,
        subscription.id
      );
    }

    return { subscriptionId: subscription.id };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { subscriptionId: null, error };
  }
}

/**
 * Cancel a subscription
 * @param userId The user ID
 * @param subscriptionId The Stripe subscription ID
 * @param cancelAtPeriodEnd Whether to cancel at the end of the current period
 * @returns Result of the operation
 */
export async function cancelSubscription(
  userId: string,
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{ success: boolean; error?: any }> {
  try {
    // Get clients
    const stripe = _stripeClientForTesting || getStripeClient();
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!stripe || !supabase) {
      return { success: false, error: new Error('Services not initialized') };
    }

    // Verify that the subscription belongs to the user
    const { data: subscriptionData, error: fetchError } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (fetchError || !subscriptionData) {
      console.error('Error fetching subscription:', fetchError);
      return { success: false, error: fetchError || new Error('Subscription not found') };
    }

    let updatedSubscription;

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      // Cancel immediately
      updatedSubscription = await stripe.subscriptions.cancel(subscriptionId);
    }

    // Update the subscription in the database
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { success: true, error: updateError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error };
  }
}

/**
 * Get a user's active subscriptions
 * @param userId The user ID
 * @returns List of active subscriptions
 */
export async function getUserSubscriptions(
  userId: string
): Promise<{ subscriptions: SubscriptionDetails[]; error?: any }> {
  try {
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!supabase) {
      return { subscriptions: [], error: new Error('Supabase client not initialized') };
    }

    // Get the user's subscriptions from the database
    const { data, error } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_prices:stripe_price_id (
          *,
          stripe_products:stripe_product_id (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return { subscriptions: [], error };
    }

    // Map the data to the SubscriptionDetails interface
    const subscriptions: SubscriptionDetails[] = data.map((sub) => {
      const price = sub.stripe_prices as any;
      const product = price?.stripe_products as any;

      return {
        id: sub.stripe_subscription_id,
        status: sub.status,
        currentPeriodStart: new Date(sub.current_period_start),
        currentPeriodEnd: new Date(sub.current_period_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        priceId: sub.stripe_price_id,
        productName: product?.name || 'Subscription',
        productDescription: product?.description,
        amount: price?.unit_amount ? price.unit_amount / 100 : 0,
        currency: price?.currency || 'usd',
        interval: price?.recurring_interval,
        creditsPerRenewal: price?.credits_amount || 0,
      };
    });

    return { subscriptions };
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    return { subscriptions: [], error };
  }
}

/**
 * Handle a subscription renewal (invoice.payment_succeeded event)
 * @param event The Stripe event
 * @returns Result of the operation
 */
export async function handleSubscriptionRenewal(
  event: Stripe.Event
): Promise<{ success: boolean; error?: any }> {
  try {
    const invoice = event.data.object as Stripe.Invoice;

    // Skip if this is not a subscription invoice
    if (!invoice.subscription) {
      return { success: true };
    }

    // Get clients
    const stripe = _stripeClientForTesting || getStripeClient();
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    if (!stripe || !supabase) {
      return { success: false, error: new Error('Services not initialized') };
    }

    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

    // Get the user ID from the subscription metadata
    const userId = subscription.metadata.userId;

    if (!userId) {
      // Try to get the user ID from the customer
      const { data: subscriptionData, error: fetchError } = await supabase
        .from('stripe_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (fetchError || !subscriptionData) {
        console.error('Error fetching subscription:', fetchError);
        return { success: false, error: fetchError || new Error('User ID not found') };
      }

      // Use the user ID from the database
      const userId = subscriptionData.user_id;

      // Update the subscription metadata in Stripe for future events
      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          ...subscription.metadata,
          userId,
        },
      });
    }

    // Get the price details to determine the credits amount
    const priceId = subscription.items.data[0].price.id;
    const { data: priceData, error: priceError } = await supabase
      .from('stripe_prices')
      .select('*')
      .eq('stripe_price_id', priceId)
      .single();

    if (priceError || !priceData) {
      console.error('Error fetching price:', priceError);
      return { success: false, error: priceError || new Error('Price not found') };
    }

    // Add the credits to the user's balance
    const creditsAmount = priceData.credits_amount;
    const result = await addCredits(
      userId,
      creditsAmount,
      `Subscription renewal (${creditsAmount} credits)`,
      CreditTransactionType.ADDITION,
      invoice.id
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Update the subscription in the database
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { success: true, error: updateError };
    }

    // Record the payment in the payment history
    const { error: paymentError } = await supabase.from('stripe_payment_history').insert({
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_payment_intent_id: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      credits_amount: creditsAmount,
      status: 'completed',
    });

    if (paymentError) {
      console.error('Error recording payment history:', paymentError);
      return { success: true, error: paymentError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
    return { success: false, error };
  }
}
