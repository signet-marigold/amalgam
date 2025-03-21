/**
 * Debug utility for the video editor application
 * Provides console logging with timestamps and categories
 */

let debugMode = false;

export function initDebugger(isDebugMode: boolean): void {
  debugMode = isDebugMode;

  if (debugMode) {
    console.log('[Debug] Debug mode enabled');
  }
}

export function debug(...args: any[]): void {
  if (!debugMode) return;

  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[Debug ${timestamp}]`, ...args);
}

export function error(...args: any[]): void {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.error(`[Error ${timestamp}]`, ...args);
}

export function warn(...args: any[]): void {
  if (!debugMode) return;

  const timestamp = new Date().toISOString().substring(11, 23);
  console.warn(`[Warn ${timestamp}]`, ...args);
}

export function time(label: string): void {
  if (!debugMode) return;

  console.time(`[Time] ${label}`);
}

export function timeEnd(label: string): void {
  if (!debugMode) return;

  console.timeEnd(`[Time] ${label}`);
}

export function group(label: string): void {
  if (!debugMode) return;

  console.group(`[Group] ${label}`);
}

export function groupEnd(): void {
  if (!debugMode) return;

  console.groupEnd();
}

/**
 * Creates a logger for a specific component
 * @param component Component name for the logger
 * @returns Object with log methods scoped to the component
 */
export function createLogger(component: string) {
  return {
    debug: (...args: any[]) => debug(`[${component}]`, ...args),
    error: (...args: any[]) => error(`[${component}]`, ...args),
    warn: (...args: any[]) => warn(`[${component}]`, ...args),
    time: (label: string) => time(`${component}:${label}`),
    timeEnd: (label: string) => timeEnd(`${component}:${label}`),
  };
}
