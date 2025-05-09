import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient, handleSuccessfulPayment, handleSubscriptionRenewal } from '@/lib/stripe';

// Disable body parsing, we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      console.error('Stripe client not initialized');
      return NextResponse.json(
        { error: 'Stripe client not initialized' },
        { status: 500 }
      );
    }

    // Get the webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not found');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get the signature from the headers
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Get the raw body
    const rawBody = await request.text();

    // Verify the webhook signature
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment is successful and the subscription is created
        // You can provision the subscription here
        const { success, error } = await handleSuccessfulPayment(event);

        if (!success) {
          console.error('Error handling successful payment:', error);
          return NextResponse.json(
            { error: 'Error handling successful payment' },
            { status: 500 }
          );
        }

        break;
      case 'invoice.payment_succeeded':
        // Handle subscription renewal
        const { success: renewalSuccess, error: renewalError } = await handleSubscriptionRenewal(event);

        if (!renewalSuccess) {
          console.error('Error handling subscription renewal:', renewalError);
          return NextResponse.json(
            { error: 'Error handling subscription renewal' },
            { status: 500 }
          );
        }

        break;
      case 'invoice.paid':
        // Continue to provision the subscription as payments continue to be made
        // Store the status in your database and check when a user accesses your service
        // This approach helps you avoid hitting rate limits
        break;
      case 'invoice.payment_failed':
        // The payment failed or the customer does not have a valid payment method
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information
        break;
      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error in webhook API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
