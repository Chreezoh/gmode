/**
 * Logger utility
 */
import { IS_PRODUCTION, IS_TEST } from '../config/constants';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableMetrics: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: !IS_TEST,
  enableMetrics: IS_PRODUCTION,
};

/**
 * Current logger configuration
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 * @param config Logger configuration
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Log a message
 * @param level Log level
 * @param message Message to log
 * @param context Additional context
 */
export function log(level: LogLevel, message: string, context?: Record<string, any>): void {
  // Skip if log level is below minimum
  if (shouldSkipLog(level)) {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  // Log to console if enabled
  if (currentConfig.enableConsole) {
    logToConsole(entry);
  }

  // Log to metrics if enabled
  if (currentConfig.enableMetrics) {
    // This would be implemented to send logs to a metrics service
    // logToMetrics(entry);
  }
}

/**
 * Check if a log should be skipped based on level
 * @param level Log level
 * @returns Whether to skip the log
 */
function shouldSkipLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const minLevelIndex = levels.indexOf(currentConfig.minLevel);
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex < minLevelIndex;
}

/**
 * Log to console
 * @param entry Log entry
 */
function logToConsole(entry: LogEntry): void {
  const { level, message, timestamp, context } = entry;
  
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(formattedMessage, context || '');
      break;
    case LogLevel.INFO:
      console.info(formattedMessage, context || '');
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage, context || '');
      break;
    case LogLevel.ERROR:
      console.error(formattedMessage, context || '');
      break;
  }
}

/**
 * Convenience methods
 */
export const logger = {
  debug: (message: string, context?: Record<string, any>) => log(LogLevel.DEBUG, message, context),
  info: (message: string, context?: Record<string, any>) => log(LogLevel.INFO, message, context),
  warn: (message: string, context?: Record<string, any>) => log(LogLevel.WARN, message, context),
  error: (message: string, context?: Record<string, any>) => log(LogLevel.ERROR, message, context),
};
