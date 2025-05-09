import contextIntegrationExample from './context-integration-example';

/**
 * Run the context integration example
 */
async function runContextIntegrationExample() {
  console.log('Running context integration example...');
  await contextIntegrationExample();
  console.log('Context integration example completed.');
}

// This is just an example and would not be executed directly in a real application
// runContextIntegrationExample().catch(console.error);

export default runContextIntegrationExample;
