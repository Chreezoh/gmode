import { saveMessage, getRecentMessages, clearUserMessages } from '../memories';

/**
 * Example of how to use the memory functions
 */
async function memoryExample() {
  // Example user ID (in a real app, this would come from the authenticated user)
  const userId = 'auth0|123456789';

  // Example 1: Save a new message
  const saveResult = await saveMessage({
    user_id: userId,
    role: 'user',
    content: 'Hello, this is a test message',
  });

  if (saveResult.error) {
    console.error('Failed to save message:', saveResult.error);
  } else {
    console.log('Message saved successfully:', saveResult.data);
  }

  // Example 2: Get the 5 most recent messages
  const getResult = await getRecentMessages(userId, 5);

  if (getResult.error) {
    console.error('Failed to fetch messages:', getResult.error);
  } else {
    console.log('Recent messages:', getResult.data);
  }

  // Example 3: Clear all messages for the user
  // Note: This is typically not called directly, but shown here as an example
  const clearResult = await clearUserMessages(userId);

  if (clearResult.error) {
    console.error('Failed to clear messages:', clearResult.error);
  } else {
    console.log('Messages cleared successfully');
  }
}

// This is just an example and would not be executed directly in a real application
// memoryExample();

export default memoryExample;
