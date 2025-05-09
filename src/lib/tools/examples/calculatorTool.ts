/**
 * Calculator Tool Example
 * 
 * This is an example implementation of a simple calculator tool.
 */

import { ExtendedTool, ToolCategory } from '../types';

/**
 * Create a calculator tool
 * @returns A calculator tool
 */
export function createCalculatorTool(): ExtendedTool {
  return {
    name: 'calculator',
    description: 'Perform basic arithmetic calculations',
    category: ToolCategory.UTILITY,
    version: '1.0.0',
    requiresAuth: false,
    parameters: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The arithmetic operation to perform',
      },
      a: {
        type: 'number',
        description: 'The first operand',
      },
      b: {
        type: 'number',
        description: 'The second operand',
      },
    },
    execute: async (args: { operation: string; a: number; b: number }) => {
      try {
        const { operation, a, b } = args;
        
        let result: number;
        
        switch (operation) {
          case 'add':
            result = a + b;
            break;
          case 'subtract':
            result = a - b;
            break;
          case 'multiply':
            result = a * b;
            break;
          case 'divide':
            if (b === 0) {
              throw new Error('Division by zero is not allowed');
            }
            result = a / b;
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        return {
          operation,
          a,
          b,
          result,
        };
      } catch (error) {
        console.error('Error performing calculation:', error);
        throw new Error(`Calculation failed: ${(error as Error).message}`);
      }
    },
    metadata: {
      complexity: 'simple',
    },
  };
}