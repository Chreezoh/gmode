/**
 * Error handling utilities
 */

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  statusCode: number;
  details: any;

  constructor(message: string, details: any) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Custom error class for billing errors
 */
export class BillingError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code: string, statusCode: number = 402) {
    super(message);
    this.name = 'BillingError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Custom error class for tool errors
 */
export class ToolError extends Error {
  toolName: string;
  retryable: boolean;

  constructor(message: string, toolName: string, retryable: boolean = true) {
    super(message);
    this.name = 'ToolError';
    this.toolName = toolName;
    this.retryable = retryable;
  }
}

/**
 * Format an error for API responses
 * @param error The error to format
 * @returns Formatted error object
 */
export function formatErrorResponse(error: unknown): { error: string; details?: any; statusCode?: number } {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  } else if (error instanceof AuthError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
    };
  } else if (error instanceof ValidationError) {
    return {
      error: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  } else if (error instanceof BillingError) {
    return {
      error: error.message,
      details: { code: error.code },
      statusCode: error.statusCode,
    };
  } else if (error instanceof ToolError) {
    return {
      error: error.message,
      details: { toolName: error.toolName, retryable: error.retryable },
    };
  } else if (error instanceof Error) {
    return {
      error: error.message,
    };
  } else {
    return {
      error: 'An unknown error occurred',
    };
  }
}
