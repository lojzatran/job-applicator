'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ThemePreferenceContextValue = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const savedMode = window.localStorage.getItem('theme');

  if (savedMode === 'dark') {
    return true;
  }

  if (savedMode === 'light') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemePreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    window.localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((currentMode) => !currentMode);
  };

  return (
    <ThemePreferenceContext.Provider
      value={{ isDarkMode, toggleDarkMode }}
    >
      {children}
    </ThemePreferenceContext.Provider>
  );
};

export const useThemePreferenceContext = () => {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error(
      'useThemePreferenceContext must be used within ThemePreferenceProvider',
    );
  }

  return context;
};
