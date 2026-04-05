import type { PropsWithChildren } from "react";

type LogContext = Record<string, unknown>;

export const isDatadogEnabled = false;

export function DatadogAppProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function logDebug(_message: string, _context: LogContext = {}) {}

export function logInfo(_message: string, _context: LogContext = {}) {}

export function logWarn(_message: string, _context: LogContext = {}) {}

export function logError(_message: string, _error: unknown, _context: LogContext = {}) {}

export function setDatadogUser(_user: {
  id: string;
  name?: string;
  email?: string;
  extraInfo?: Record<string, unknown>;
}) {}

export function clearDatadogUser() {}
