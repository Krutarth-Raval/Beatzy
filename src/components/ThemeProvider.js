'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isLight = theme === 'light';

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.body.classList.toggle('light-theme', isLight);
    window.localStorage.setItem('theme', theme);
  }, [mounted, theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light'),
    isLight: theme === 'light',
    isDark: theme === 'dark',
    mounted,
  }), [theme, mounted]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
