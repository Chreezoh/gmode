import { saveToolConfig, getToolConfig, getAllToolConfigs, deleteToolConfig } from '../toolConfigs';

/**
 * Example of how to use the tool configuration functions
 */
async function toolConfigExample() {
  // Example user ID (in a real app, this would come from the authenticated user)
  const userId = 'auth0|123456789';

  // Example 1: Save a new tool configuration
  const saveResult = await saveToolConfig({
    user_id: userId,
    tool_name: 'openai',
    config_json: {
      api_key: 'sk-example123456789',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    },
  });

  if (saveResult.error) {
    console.error('Failed to save tool configuration:', saveResult.error);
  } else {
    console.log('Tool configuration saved successfully:', saveResult.data);
  }

  // Example 2: Get a specific tool configuration
  const getResult = await getToolConfig(userId, 'openai');

  if (getResult.error) {
    console.error('Failed to fetch tool configuration:', getResult.error);
  } else {
    console.log('Tool configuration:', getResult.data);
  }

  // Example 3: Get all tool configurations for a user
  const getAllResult = await getAllToolConfigs(userId);

  if (getAllResult.error) {
    console.error('Failed to fetch tool configurations:', getAllResult.error);
  } else {
    console.log('All tool configurations:', getAllResult.data);
  }

  // Example 4: Update an existing tool configuration
  const updateResult = await saveToolConfig({
    user_id: userId,
    tool_name: 'openai',
    config_json: {
      api_key: 'sk-example123456789',
      model: 'gpt-4-turbo',  // Updated model
      temperature: 0.5,      // Updated temperature
      max_tokens: 4000       // Updated max_tokens
    },
  });

  if (updateResult.error) {
    console.error('Failed to update tool configuration:', updateResult.error);
  } else {
    console.log('Tool configuration updated successfully:', updateResult.data);
  }

  // Example 5: Delete a tool configuration
  const deleteResult = await deleteToolConfig(userId, 'openai');

  if (deleteResult.error) {
    console.error('Failed to delete tool configuration:', deleteResult.error);
  } else {
    console.log('Tool configuration deleted successfully');
  }
}

// This is just an example and would not be executed directly in a real application
// toolConfigExample();

export default toolConfigExample;
