import { combineMemoryWithInstruction, createOrchestrationPrompt } from '../orchestration/contextIntegration';
import { orchestrate } from '../orchestration/orchestrator';
import { Message, OrchestrationRequest, Tool } from '../orchestration/types';
import { saveMessage } from '../memories';

/**
 * Example tools for demonstration
 */
const exampleTools: Tool[] = [
  {
    name: 'search',
    description: 'Search for information on the web',
    parameters: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return',
        optional: true,
      },
    },
    execute: async (args: { query: string; numResults?: number }) => {
      // This is a mock implementation
      console.log(`Searching for "${args.query}" with ${args.numResults || 5} results`);
      
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Return mock data
      return {
        query: args.query,
        results: [
          {
            title: 'Example Search Result 1',
            url: 'https://example.com/result1',
            snippet: 'This is an example search result that matches the query.',
          },
          {
            title: 'Example Search Result 2',
            url: 'https://example.com/result2',
            snippet: 'Another example search result with relevant information.',
          },
        ],
      };
    },
  },
];

/**
 * Example of how to use the context integration functions
 */
async function contextIntegrationExample() {
  // Example user ID (in a real app, this would come from the authenticated user)
  const userId = 'auth0|123456789';

  // Example 1: Save some messages to the database for testing
  console.log('Saving example messages to the database...');
  
  // Clear previous messages and add some new ones for this example
  const messages = [
    {
      user_id: userId,
      role: 'user' as const,
      content: 'Hello, I need help with my research on climate change.',
    },
    {
      user_id: userId,
      role: 'assistant' as const,
      content: 'I\'d be happy to help with your climate change research. What specific aspects are you interested in?',
    },
    {
      user_id: userId,
      role: 'user' as const,
      content: 'I\'m particularly interested in the impact on coastal cities.',
    },
    {
      user_id: userId,
      role: 'assistant' as const,
      content: 'Coastal cities face several challenges due to climate change, including sea level rise, increased storm intensity, and flooding. Would you like me to help you find specific information about these impacts?',
    },
    {
      user_id: userId,
      role: 'user' as const,
      content: 'Yes, please find information about sea level rise projections.',
    },
  ];
  
  // Save each message to the database
  for (const message of messages) {
    await saveMessage(message);
  }
  
  // Example 2: Combine memory with a new instruction
  console.log('\nExample 2: Combining memory with a new instruction');
  const newInstruction = 'What adaptation strategies are being implemented in Miami?';
  
  const combinedMessages = await combineMemoryWithInstruction(userId, newInstruction);
  
  console.log('Combined messages:');
  combinedMessages.forEach((message, index) => {
    console.log(`[${index + 1}] ${message.role}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`);
  });
  
  // Example 3: Create a complete orchestration prompt
  console.log('\nExample 3: Creating a complete orchestration prompt');
  const systemMessage = 'You are a helpful assistant specializing in climate science and environmental policy.';
  
  const orchestrationPrompt = await createOrchestrationPrompt(userId, newInstruction, systemMessage);
  
  console.log('Orchestration prompt:');
  orchestrationPrompt.forEach((message, index) => {
    console.log(`[${index + 1}] ${message.role}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`);
  });
  
  // Example 4: Use the prompt with the orchestrator
  console.log('\nExample 4: Using the prompt with the orchestrator');
  
  // Create the orchestration request
  const request: OrchestrationRequest = {
    instruction: newInstruction,
    context: {
      userId,
      // Instead of manually setting memory, we'll use our new function
      memory: await combineMemoryWithInstruction(userId, newInstruction),
      additionalContext: 'The user is researching climate change adaptation strategies.',
    },
    tools: exampleTools,
  };
  
  // In a real application, you would call the orchestrator here
  console.log('Orchestration request prepared with memory integration.');
  console.log('Number of memory messages included:', request.context.memory.length - 1); // -1 for the new instruction
}

// This is just an example and would not be executed directly in a real application
// contextIntegrationExample().catch(console.error);

export default contextIntegrationExample;
