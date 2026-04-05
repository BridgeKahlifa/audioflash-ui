import type { PropsWithChildren } from "react";
import {
  DatadogProvider,
  DatadogProviderConfiguration,
  DdLogs,
  DdSdkReactNative,
  LogsConfiguration,
  TrackingConsent,
  SdkVerbosity,
  InitializationMode,
} from "@datadog/mobile-react-native";

type LogContext = Record<string, unknown>;

const DATADOG_CLIENT_TOKEN = process.env.EXPO_PUBLIC_DATADOG_CLIENT_TOKEN?.trim() ?? "";
const DATADOG_ENV = process.env.EXPO_PUBLIC_DATADOG_ENV?.trim() || "development";
const DATADOG_SERVICE = process.env.EXPO_PUBLIC_DATADOG_SERVICE?.trim() || "audioflash-mobile";
const DATADOG_SITE = process.env.EXPO_PUBLIC_DATADOG_SITE?.trim() || "US1";
const DATADOG_ENV_DISABLED = DATADOG_ENV.toLowerCase() === "local";

export const isDatadogEnabled = DATADOG_CLIENT_TOKEN.length > 0 && !DATADOG_ENV_DISABLED;

const configuration = isDatadogEnabled
  ? new DatadogProviderConfiguration(DATADOG_CLIENT_TOKEN, DATADOG_ENV, TrackingConsent.GRANTED, {
      service: DATADOG_SERVICE,
      site: DATADOG_SITE,
      logsConfiguration: new LogsConfiguration(),
      verbosity: __DEV__ ? SdkVerbosity.DEBUG : SdkVerbosity.WARN,
    })
  : null;

if (configuration) {
  configuration.initializationMode = InitializationMode.ASYNC;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      kind: error.name || "Error",
      message: error.message,
      stack: error.stack ?? "",
    };
  }

  return {
    kind: "Error",
    message: typeof error === "string" ? error : "Unknown error",
    stack: "",
  };
}

export function DatadogAppProvider({ children }: PropsWithChildren) {
  if (!configuration) {
    return <>{children}</>;
  }

  return <DatadogProvider configuration={configuration}>{children}</DatadogProvider>;
}

export function logDebug(message: string, context: LogContext = {}) {
  if (!isDatadogEnabled) return;
  void DdLogs.debug(message, context);
}

export function logInfo(message: string, context: LogContext = {}) {
  if (!isDatadogEnabled) return;
  void DdLogs.info(message, context);
}

export function logWarn(message: string, context: LogContext = {}) {
  if (!isDatadogEnabled) return;
  void DdLogs.warn(message, context);
}

export function logError(message: string, error: unknown, context: LogContext = {}) {
  if (!isDatadogEnabled) return;

  const normalizedError = normalizeError(error);
  void DdLogs.error(
    message,
    normalizedError.kind,
    normalizedError.message,
    normalizedError.stack,
    context,
  );
}

export function setDatadogUser(user: {
  id: string;
  name?: string;
  email?: string;
  extraInfo?: Record<string, unknown>;
}) {
  if (!isDatadogEnabled) return;
  void DdSdkReactNative.setUserInfo(user);
}

export function clearDatadogUser() {
  if (!isDatadogEnabled) return;
  void DdSdkReactNative.clearUserInfo();
}
