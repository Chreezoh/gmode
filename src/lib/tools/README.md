# Tools Module

This module provides a generic tool interface and registry system for managing tools that can be dynamically loaded and executed by the orchestration engine.

## Key Components

### Tool Interface

The base `Tool` interface is defined in `../orchestration/types.ts` and includes:

- `name`: Unique identifier for the tool
- `description`: Human-readable description of what the tool does
- `parameters`: JSON schema for the tool's parameters
- `execute`: Function to execute the tool with the given parameters

### Extended Tool Interface

The `ExtendedTool` interface in `./types.ts` extends the base `Tool` interface with additional metadata:

- `category`: The category of the tool (e.g., communication, utility)
- `version`: Version of the tool
- `requiresAuth`: Whether the tool requires authentication
- `cost`: The cost of using the tool (e.g., API credits)
- `rateLimit`: Rate limit information
- `metadata`: Additional metadata

### Tool Registry

The `ToolRegistry` class in `./registry.ts` provides a centralized registry for managing tools:

- `registerTool(tool)`: Register a single tool
- `registerTools(tools)`: Register multiple tools
- `getTool(name)`: Get a tool by name
- `getAllTools()`: Get all registered tools
- `getToolsByCategory(category)`: Get tools by category
- `hasTool(name)`: Check if a tool is registered
- `unregisterTool(name)`: Unregister a tool
- `clearTools()`: Clear all registered tools

### Tool Factory

The `factory.ts` module provides factory functions for creating tools:

- `createBasicTool()`: Create a basic tool with minimal configuration
- `createExtendedTool()`: Create an extended tool with additional metadata
- `registerToolFactory()`: Register a tool factory
- `createToolFromFactory()`: Create a tool using a registered factory
- `createToolForUser()`: Create a tool using a registered factory and user-specific configuration

### Error Handling

The `errorHandling.ts` module provides utilities for robust tool error handling:

- `withToolErrorHandling()`: Wrap a tool call with retry logic and fallback values
- `createToolExecuteWithErrorHandling()`: Create an execute function with built-in error handling

## Usage Examples

### Registering a Tool

```typescript
import { registerTool } from './registry';
import { createBasicTool } from './factory';

const myTool = createBasicTool(
  'my_tool',
  'A simple tool that does something',
  async (args) => {
    // Tool implementation
    return { result: 'success' };
  },
  {
    // Parameters schema
    param1: {
      type: 'string',
      description: 'A parameter',
    },
  }
);

registerTool(myTool);
```

### Using a Tool

```typescript
import { getTool } from './registry';

async function useTool() {
  const tool = getTool('my_tool');

  if (tool) {
    const result = await tool.execute({
      param1: 'value',
    });

    console.log('Tool result:', result);
  }
}
```

### Creating a Tool Factory

```typescript
import { registerToolFactory, createToolFromFactory } from './factory';
import { createExtendedTool } from './factory';
import { ToolCategory } from './types';

// Define a factory function
function createMyTool(config) {
  return createExtendedTool(
    'my_tool',
    'A configurable tool',
    ToolCategory.UTILITY,
    async (args) => {
      // Use config in implementation
      console.log(`Using API key: ${config.apiKey}`);
      return { result: 'success' };
    },
    {
      // Parameters schema
      param1: {
        type: 'string',
        description: 'A parameter',
      },
    }
  );
}

// Register the factory
registerToolFactory('my_tool_factory', createMyTool, {
  apiKey: 'default-key',
});

// Create a tool from the factory
const myTool = createToolFromFactory('my_tool_factory', {
  apiKey: 'custom-key',
});
```

### Using Error Handling

```typescript
import { withToolErrorHandling, createToolExecuteWithErrorHandling } from './errorHandling';
import { createBasicTool } from './factory';

// Example 1: Using withToolErrorHandling directly
const myTool = createBasicTool(
  'my_tool',
  'A tool with error handling',
  async (args) => {
    return withToolErrorHandling(
      async () => {
        // Original implementation that might fail
        const response = await fetch(`https://api.example.com/data?id=${args.id}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
      },
      {
        maxRetries: 2,
        retryDelayMs: 1000,
        defaultValue: { error: 'Data unavailable', id: args.id },
      }
    );
  },
  {
    id: {
      type: 'string',
      description: 'The ID to fetch',
    },
  }
);

// Example 2: Using createToolExecuteWithErrorHandling
const originalExecute = async (args) => {
  // Implementation that might fail
  const response = await fetch(`https://api.example.com/data?id=${args.id}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return await response.json();
};

const executeWithErrorHandling = createToolExecuteWithErrorHandling(
  originalExecute,
  {
    maxRetries: 2,
    retryDelayMs: 1000,
    defaultValue: { error: 'Data unavailable' },
  }
);

const myTool2 = createBasicTool(
  'my_tool_2',
  'Another tool with error handling',
  executeWithErrorHandling,
  {
    id: {
      type: 'string',
      description: 'The ID to fetch',
    },
  }
);
```

## Best Practices

1. **Unique Names**: Ensure each tool has a unique name to avoid conflicts in the registry.
2. **Clear Descriptions**: Provide clear, concise descriptions of what each tool does.
3. **Proper Parameter Schemas**: Define parameter schemas with types, descriptions, and whether they're optional.
4. **Error Handling**: Implement proper error handling in the `execute` function using the error handling utilities.
5. **Categorization**: Use appropriate categories for tools to help with organization.
6. **Documentation**: Document each tool's purpose, parameters, and return values.
7. **Testing**: Write tests for each tool to ensure it works as expected.
8. **Retry Configuration**: Configure appropriate retry counts and delays based on the tool's purpose and expected failure modes.
9. **Fallback Values**: Provide meaningful fallback values that allow the system to continue functioning when a tool fails.