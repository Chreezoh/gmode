import orchestrationExample from './orchestration/orchestration-example';

/**
 * Example of how to use the orchestration engine
 */
async function runOrchestrationExample() {
  console.log('Running orchestration example...');
  await orchestrationExample();
  console.log('Orchestration example completed.');
}

// This is just an example and would not be executed directly in a real application
// runOrchestrationExample().catch(console.error);

export default runOrchestrationExample;
