/**
 * Jednostavan JSON logger. Pravilo: u log nikad ne ide API ključ, lozinka ni lični podaci kupaca.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(minLevel: Level = 'info'): Logger {
  const write = (level: Level, message: string, data?: Record<string, unknown>) => {
    if (order[level] < order[minLevel]) return;
    const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...data });
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
  };
  return {
    debug: (m, d) => write('debug', m, d),
    info: (m, d) => write('info', m, d),
    warn: (m, d) => write('warn', m, d),
    error: (m, d) => write('error', m, d),
  };
}
