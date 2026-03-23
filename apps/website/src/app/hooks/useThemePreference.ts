'use client';

import { useEffect, useState } from 'react';

export const useThemePreference = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('theme');

    if (savedMode === 'dark') {
      setIsDarkMode(true);
      return;
    }

    if (savedMode === 'light') {
      setIsDarkMode(false);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((currentMode) => {
      const nextMode = !currentMode;
      localStorage.setItem('theme', nextMode ? 'dark' : 'light');
      return nextMode;
    });
  };

  return { isDarkMode, toggleDarkMode };
};
