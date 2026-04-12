import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { vars } from "nativewind";
import { getSettings, setSettings } from "./storage";

type ThemeContextValue = {
  matrixMode: boolean;
  setMatrixMode: (enabled: boolean) => Promise<void>;
  statusBarStyle: "light" | "dark";
  fontFamily?: string;
};

const defaultThemeVars = vars({
  "--background": "255 247 242",
  "--card": "255 253 252",
  "--secondary": "251 231 222",
  "--accent": "255 217 202",
  "--border": "242 203 190",
  "--foreground": "47 30 25",
  "--muted": "139 110 102",
  "--primary": "232 106 74",
  "--primary-foreground": "255 255 255",
});

const matrixThemeVars = vars({
  "--background": "0 0 0",
  "--card": "10 10 10",
  "--secondary": "26 26 26",
  "--accent": "41 17 11",
  "--border": "92 38 26",
  "--foreground": "255 140 66",
  "--muted": "201 112 77",
  "--primary": "255 107 74",
  "--primary-foreground": "0 0 0",
});

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [matrixMode, setMatrixModeState] = useState(true);

  useEffect(() => {
    const matrixFontFamily = Platform.select({
      ios: "Courier",
      android: "monospace",
      default: "monospace",
    });

    const textDefaults = Text.defaultProps ?? {};
    const textInputDefaults = TextInput.defaultProps ?? {};

    Text.defaultProps = {
      ...textDefaults,
      style: [
        textDefaults.style,
        matrixMode && matrixFontFamily ? { fontFamily: matrixFontFamily } : null,
      ],
    };

    TextInput.defaultProps = {
      ...textInputDefaults,
      style: [
        textInputDefaults.style,
        matrixMode && matrixFontFamily ? { fontFamily: matrixFontFamily } : null,
      ],
    };
  }, [matrixMode]);

  useEffect(() => {
    let mounted = true;

    getSettings().then((settings) => {
      if (mounted) {
        setMatrixModeState(settings.matrixMode);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const setMatrixMode = async (enabled: boolean) => {
    setMatrixModeState(enabled);
    const settings = await getSettings();
    await setSettings({ ...settings, matrixMode: enabled });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      matrixMode,
      setMatrixMode,
      statusBarStyle: matrixMode ? "light" : "dark",
      fontFamily: matrixMode
        ? Platform.select({
            ios: "Courier",
            android: "monospace",
            default: "monospace",
          })
        : undefined,
    }),
    [matrixMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[matrixMode ? matrixThemeVars : defaultThemeVars, { flex: 1 }]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }

  return context;
}
