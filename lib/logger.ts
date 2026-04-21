// Centralized logging system with minimal, clean output
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'APP', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  private formatMessage(level: string, message: string): string {
    return `[${this.prefix}] ${level}: ${message}`;
  }

  error(message: string, ...args: any[]) {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.level >= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }
}

// Pre-configured loggers for different components
export const loggers = {
  app: new Logger('APP'),
  mqtt: new Logger('MQTT'),
  service: new Logger('SERVICE'),
  scheduler: new Logger('SCHEDULER'),
  database: new Logger('DATABASE'),
  api: new Logger('API'),
  user: new Logger('USER'),
  device: new Logger('DEVICE'),
  alarm: new Logger('ALARM'),
  cleanup: new Logger('CLEANUP'),
  lora: new Logger('LORA'),
  bill: new Logger('BILL'),
  calculation: new Logger('CALCULATION'),
  health: new Logger('HEALTH'),
  stats: new Logger('STATS'),
  gateway: new Logger('GATEWAY'),
  external: new Logger('EXTERNAL'),
  location: new Logger('LOCATION'),
  ruleChain: new Logger('RULE-CHAIN'),
  whatsapp: new Logger('WHATSAPP')
};

// Set log level based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Global log level override via environment variable
const envLogLevel = process.env.LOG_LEVEL;
const defaultLogLevel = envLogLevel ?
  LogLevel[envLogLevel.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO :
  (isProduction ? LogLevel.ERROR : LogLevel.INFO);

if (isProduction) {
  Object.values(loggers).forEach(logger => {
    (logger as any).level = defaultLogLevel;
  });
} else if (isDevelopment) {
  Object.values(loggers).forEach(logger => {
    (logger as any).level = LogLevel.INFO; // Info level for development
  });
}

// Scheduler-specific debug override
if (process.env.SCHEDULER_DEBUG === 'true' || envLogLevel === 'DEBUG') {
  (loggers.scheduler as any).level = LogLevel.DEBUG;
} else if (process.env.SCHEDULER_DEBUG === 'info' || envLogLevel === 'INFO') {
  (loggers.scheduler as any).level = LogLevel.INFO;
}

// Export default logger
export default loggers.app;
