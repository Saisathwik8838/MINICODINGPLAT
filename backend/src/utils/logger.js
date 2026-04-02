const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (...args) => console.log(`[${getTimestamp()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${getTimestamp()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${getTimestamp()}] [ERROR]`, ...args),
  debug: (...args) => console.debug(`[${getTimestamp()}] [DEBUG]`, ...args),
};
