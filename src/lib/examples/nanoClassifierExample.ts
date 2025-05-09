import { classifyText, classifyWithFunctionCalling } from '../orchestration/nanoClassifier';

/**
 * Example of using the GPT-4.1-nano classifier for sentiment analysis
 */
export async function classifySentiment(text: string): Promise<string> {
  try {
    // Define the possible sentiment labels
    const labels = ['Positive', 'Negative', 'Neutral'] as const;
    
    // Call the classifier
    const result = await classifyText(
      text,
      labels,
      'Classify the sentiment of this text as Positive, Negative, or Neutral. Respond with ONLY the category name.',
      {
        // Use environment variable for API key
        apiKey: process.env.OPENAI_API_KEY || '',
        // Lower temperature for more deterministic results
        temperature: 0.1,
      }
    );
    
    // Log token usage for billing purposes
    console.log('Token usage:', result.usage);
    
    return result.label;
  } catch (error) {
    console.error('Sentiment classification error:', error);
    // Default to Neutral if classification fails
    return 'Neutral';
  }
}

/**
 * Example of using the GPT-4.1-nano classifier with function calling for urgency detection
 */
export async function classifyUrgency(text: string): Promise<'Urgent' | 'Normal' | 'Low'> {
  try {
    // Define the possible urgency labels
    const labels = ['Urgent', 'Normal', 'Low'] as const;
    
    // Call the classifier with function calling
    const result = await classifyWithFunctionCalling(
      text,
      {
        functionName: 'classifyUrgency',
        parameterName: 'urgency',
        labels: labels,
        description: 'Determine if the message is urgent, normal, or low priority.',
      },
      {
        // Use environment variable for API key
        apiKey: process.env.OPENAI_API_KEY || '',
        // Lower temperature for more deterministic results
        temperature: 0.1,
      }
    );
    
    // Log token usage for billing purposes
    console.log('Token usage:', result.usage);
    
    return result.label;
  } catch (error) {
    console.error('Urgency classification error:', error);
    // Default to Normal if classification fails
    return 'Normal';
  }
}

/**
 * Example of using the GPT-4.1-nano classifier for topic categorization
 */
export async function categorizeMessage(text: string): Promise<string> {
  try {
    // Define the possible topic categories
    const categories = [
      'Question',
      'Feedback',
      'Bug Report',
      'Feature Request',
      'Support',
      'Other',
    ] as const;
    
    // Call the classifier
    const result = await classifyText(
      text,
      categories,
      'Categorize this message into one of these categories: Question, Feedback, Bug Report, Feature Request, Support, Other. Respond with ONLY the category name.',
      {
        // Use environment variable for API key
        apiKey: process.env.OPENAI_API_KEY || '',
        // Slightly higher temperature for this task
        temperature: 0.3,
      }
    );
    
    // Log token usage for billing purposes
    console.log('Token usage:', result.usage);
    
    return result.label;
  } catch (error) {
    console.error('Message categorization error:', error);
    // Default to Other if classification fails
    return 'Other';
  }
}