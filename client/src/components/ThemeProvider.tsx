import { createContext, useContext, useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { updateSettingsApi, RootState } from '@/store/settingsSlice';

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey,
  ...props
}: ThemeProviderProps) {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  // Track if we're manually changing the theme to avoid settings overriding it
  const [manuallyChanging, setManuallyChanging] = useState(false);
  const [theme, setThemeState] = useState<Theme>(
    // Initialize with settings.theme if available
    settings.theme || defaultTheme
  );

  // Update theme when settings are loaded or changed, but only if not manually changing
  useEffect(() => {
    if (settings.theme && !settings.isLoading && !manuallyChanging) {
      setThemeState(settings.theme);
    }
  }, [settings.theme, settings.isLoading, manuallyChanging]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    // Mark that we're manually changing the theme
    setManuallyChanging(true);
    
    // Update the local state
    setThemeState(newTheme);
    
    // Update the settings in the database
    // @ts-ignore - Type compatibility issue with Redux Thunk
    dispatch(updateSettingsApi({ ...settings, theme: newTheme }))
      .then(() => {
        // After the update is complete, we can allow settings changes to affect the theme again
        setTimeout(() => setManuallyChanging(false), 500);
      })
      .catch(() => {
        // If there's an error, also reset the flag
        setManuallyChanging(false);
      });
  };

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
