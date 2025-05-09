import { orchestrate } from '../../orchestration/orchestrator';
import { exampleTools } from './example-tools';
import { OrchestrationRequest, Message } from '../../orchestration/types';

/**
 * Example of how to use the orchestration engine
 */
async function orchestrationExample() {
  // Example user ID (in a real app, this would come from the authenticated user)
  const userId = 'auth0|123456789';

  // Example conversation history
  const memory: Message[] = [
    {
      role: 'user',
      content: 'Hello, I need some help today.',
    },
    {
      role: 'assistant',
      content: 'Hi there! I\'m here to help. What can I assist you with today?',
    },
  ];

  // Example 1: Simple instruction
  console.log('Example 1: Simple instruction');
  const request1: OrchestrationRequest = {
    instruction: 'What\'s the weather like in San Francisco?',
    context: {
      userId,
      memory,
      additionalContext: 'The user is planning a trip to California.',
    },
    tools: exampleTools,
    maxRetries: 2,
  };

  try {
    const result1 = await orchestrate(request1);
    console.log('Orchestration result:');
    console.log('Response:', result1.response);
    console.log('Tool calls:', result1.toolCalls.length);
    result1.toolCalls.forEach((call, index) => {
      console.log(`Tool call ${index + 1}:`, call.toolName, call.result);
    });
    if (result1.errors) {
      console.log('Errors:', result1.errors);
    }
  } catch (error) {
    console.error('Orchestration failed:', error);
  }

  console.log('\n---\n');

  // Example 2: Complex instruction requiring multiple tool calls
  console.log('Example 2: Complex instruction');
  const request2: OrchestrationRequest = {
    instruction: 'Check my calendar for tomorrow and send an email to the team about the weather for our meeting location in San Francisco.',
    context: {
      userId,
      memory,
    },
    tools: exampleTools,
  };

  try {
    const result2 = await orchestrate(request2);
    console.log('Orchestration result:');
    console.log('Response:', result2.response);
    console.log('Tool calls:', result2.toolCalls.length);
    result2.toolCalls.forEach((call, index) => {
      console.log(`Tool call ${index + 1}:`, call.toolName, call.result);
    });
    if (result2.errors) {
      console.log('Errors:', result2.errors);
    }
  } catch (error) {
    console.error('Orchestration failed:', error);
  }
}

// This is just an example and would not be executed directly in a real application
// orchestrationExample();

export default orchestrationExample;
