/**
 * Pino Logger Implementation
 * 
 * This module provides a structured logging solution using Pino.
 * It supports different log levels, structured data, and redaction of sensitive information.
 */

import pino from 'pino';
import { IS_PRODUCTION, IS_TEST, IS_DEVELOPMENT } from '../config/constants';

// Define log levels that match our existing logger
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Define sensitive fields that should be redacted from logs
const REDACTED_FIELDS = [
  'password',
  'passwordConfirm',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'apiKey',
  'secret',
  'credentials',
  'credit_card',
  'creditCard',
  'cardNumber',
  'cvv',
];

// Define logger configuration
export interface PinoLoggerConfig {
  level: LogLevel;
  enabled: boolean;
  redactedFields: string[];
  prettyPrint: boolean;
  destination?: string | pino.DestinationStream;
}

// Default configuration based on environment
const defaultConfig: PinoLoggerConfig = {
  level: IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG,
  enabled: !IS_TEST, // Disable in test environment by default
  redactedFields: REDACTED_FIELDS,
  prettyPrint: IS_DEVELOPMENT, // Use pretty printing in development
};

// Current configuration
let currentConfig: PinoLoggerConfig = { ...defaultConfig };

// Create the Pino logger instance
const createPinoLogger = (config: PinoLoggerConfig) => {
  const pinoOptions: pino.LoggerOptions = {
    level: config.level,
    enabled: config.enabled,
    redact: {
      paths: config.redactedFields,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // Add pretty printing in development
  if (config.prettyPrint) {
    return pino({
      ...pinoOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }, config.destination);
  }

  return pino(pinoOptions, config.destination);
};

// Create the initial logger instance
let pinoLogger = createPinoLogger(currentConfig);

/**
 * Configure the logger
 * @param config Logger configuration
 */
export function configurePinoLogger(config: Partial<PinoLoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  pinoLogger = createPinoLogger(currentConfig);
}

/**
 * Get the current Pino logger instance
 * @returns Pino logger instance
 */
export function getPinoLogger(): pino.Logger {
  return pinoLogger;
}

/**
 * Convenience logger interface that matches our existing logger API
 */
export const pinoLogger = {
  debug: (message: string, context?: Record<string, any>) => {
    pinoLogger.debug(context || {}, message);
  },
  info: (message: string, context?: Record<string, any>) => {
    pinoLogger.info(context || {}, message);
  },
  warn: (message: string, context?: Record<string, any>) => {
    pinoLogger.warn(context || {}, message);
  },
  error: (message: string, context?: Record<string, any>) => {
    pinoLogger.error(context || {}, message);
  },
  fatal: (message: string, context?: Record<string, any>) => {
    pinoLogger.fatal(context || {}, message);
  },
};

export default pinoLogger;
