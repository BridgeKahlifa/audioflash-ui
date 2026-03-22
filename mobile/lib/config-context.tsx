import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { fetchConfig, type ApiConfig } from "./api";

interface ConfigContextValue {
  config: ApiConfig | null;
  dbEnv: string | null;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

function readDbEnv(config: ApiConfig | null): string | null {
  const value = config?.DB_ENV ?? config?.db_env ?? null;
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const dbEnv = readDbEnv(config);

  async function refreshConfig() {
    try {
      const fresh = await fetchConfig();
      setConfig(fresh);
    } catch {
      // Keep the last in-memory value if refresh fails.
    }
  }

  useEffect(() => {
    refreshConfig();
  }, []);

  useEffect(() => {
    if (!dbEnv || dbEnv.toLowerCase() === "prod") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshConfig();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dbEnv]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        dbEnv,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}
