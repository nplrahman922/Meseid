import { appendErrorLog } from './file.appender';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  module?: string;
  action?: string;
  botId?: string;
  senderId?: string;
  chatId?: string | number;
  messageId?: string | number;
  [key: string]: any;
}

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  info: '\x1b[36m',   // Cyan
  warn: '\x1b[33m',   // Yellow
  error: '\x1b[31m',  // Red
  debug: '\x1b[35m',  // Magenta
  module: '\x1b[32m', // Green
};

function formatConsoleMessage(
  level: LogLevel,
  moduleName: string,
  message: string,
  context?: LogContext,
  err?: any
): string {
  const timestamp = new Date().toISOString();
  const color = COLORS[level.toLowerCase() as keyof typeof COLORS] || COLORS.reset;
  const modTag = `${COLORS.module}[${moduleName.toUpperCase()}]${COLORS.reset}`;
  const levelTag = `${color}[${level}]${COLORS.reset}`;

  let output = `${COLORS.dim}${timestamp}${COLORS.reset} ${levelTag} ${modTag} ${message}`;

  if (context && Object.keys(context).length > 0) {
    const { module: _, ...restContext } = context;
    if (Object.keys(restContext).length > 0) {
      output += `\n  ${COLORS.dim}Context:${COLORS.reset} ${JSON.stringify(restContext)}`;
    }
  }

  if (err) {
    const errorStack = err instanceof Error ? (err.stack || err.message) : String(err);
    output += `\n  ${COLORS.error}Error Detail:${COLORS.reset} ${errorStack}`;
  }

  return output;
}

export class ModuleLogger {
  constructor(public readonly moduleName: string) {}

  debug(message: string, context?: LogContext): void {
    console.debug(formatConsoleMessage('DEBUG', this.moduleName, message, context));
  }

  info(message: string, context?: LogContext): void {
    console.log(formatConsoleMessage('INFO', this.moduleName, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(formatConsoleMessage('WARN', this.moduleName, message, context));
    appendErrorLog('WARN', this.moduleName, message, context);
  }

  error(message: string, error?: any, context?: LogContext): void {
    console.error(formatConsoleMessage('ERROR', this.moduleName, message, context, error));
    appendErrorLog('ERROR', this.moduleName, message, context, error);
  }
}

/**
 * Membuat instance logger khusus untuk modul tertentu (misal: 'telegram', 'whatsapp', 'bot').
 */
export function createModuleLogger(moduleName: string): ModuleLogger {
  return new ModuleLogger(moduleName);
}

/**
 * Instance default logger untuk service bot.
 */
export const logger = createModuleLogger('bot');
