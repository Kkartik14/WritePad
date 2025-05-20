'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'yellow' | 'blue' | 'black' | 'white';

// Theme color definitions
const themeColors = {
  yellow: {
    background: '#F8F2D8',
    foreground: '#000000',
    sidebarBg: '#F5E5B0',
    borderColor: '#D0B56F',
    hoverBg: '#E8D396',
    editorBg: '#F8F2D8',
    textMuted: '#8A7444',
    toolbarBg: '#F5E5B0',
    modalBg: '#F5E5B0',
    accentColor: '#A97A53',
    accentHover: '#8D6544',
    kbdBg: '#E0CA80',
    kbdBorder: '#D0B56F',
    kbdText: '#000000',
    selectedBg: '#E0CA80',
    selectedFg: '#000000'
  },
  blue: {
    background: '#EFF6FF',
    foreground: '#1E3A8A',
    sidebarBg: '#DBEAFE',
    borderColor: '#93C5FD',
    hoverBg: '#BFDBFE',
    editorBg: '#EFF6FF',
    textMuted: '#3B82F6',
    toolbarBg: '#DBEAFE',
    modalBg: '#DBEAFE',
    accentColor: '#2563EB',
    accentHover: '#1D4ED8',
    kbdBg: '#BFDBFE',
    kbdBorder: '#93C5FD',
    kbdText: '#1E3A8A',
    selectedBg: '#BFDBFE',
    selectedFg: '#1E3A8A'
  },
  black: {
    background: '#121212',
    foreground: '#FFFFFF',
    sidebarBg: '#1E1E1E',
    borderColor: '#333333',
    hoverBg: '#2D2D2D',
    editorBg: '#121212',
    textMuted: '#A0A0A0',
    toolbarBg: '#1E1E1E',
    modalBg: '#1E1E1E',
    accentColor: '#BB86FC',
    accentHover: '#A855F7',
    kbdBg: '#2D2D2D',
    kbdBorder: '#444444',
    kbdText: '#FFFFFF',
    selectedBg: '#2D2D2D',
    selectedFg: '#FFFFFF'
  },
  white: {
    background: '#FFFFFF',
    foreground: '#000000',
    sidebarBg: '#F5F5F7',
    borderColor: '#E0E0E0',
    hoverBg: '#F0F0F0',
    editorBg: '#FFFFFF',
    textMuted: '#737373',
    toolbarBg: '#F5F5F7',
    modalBg: '#FFFFFF',
    accentColor: '#0F172A',
    accentHover: '#1E293B',
    kbdBg: '#F0F0F0',
    kbdBorder: '#D0D0D0',
    kbdText: '#000000',
    selectedBg: '#F0F0F0',
    selectedFg: '#000000'
  }
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>('yellow');

  // Apply theme to document
  const applyTheme = (themeName: ThemeName) => {
    if (typeof document !== 'undefined') {
      // Get the HTML element
      const htmlElement = document.documentElement;
      
      // Remove all theme classes first
      htmlElement.classList.remove('theme-yellow', 'theme-blue', 'theme-black', 'theme-white');
      
      // Add the new theme class
      htmlElement.classList.add(`theme-${themeName}`);
      
      // Apply all CSS variables directly to ensure they're applied immediately
      const colors = themeColors[themeName];
      
      // Apply all theme color variables directly to the html element
      Object.entries(colors).forEach(([key, value]) => {
        // Convert camelCase to kebab-case for CSS variables
        const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        htmlElement.style.setProperty(`--${cssVarName}`, value);
      });
      
      // Force update on body element too to ensure the theme change propagates
      document.body.classList.remove('theme-applied');
      document.body.classList.add('theme-applied');
      
      console.log(`Theme applied: theme-${themeName}`);
    }
  };

  // Load saved theme from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('writePad-theme');
      if (savedTheme && ['yellow', 'blue', 'black', 'white'].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeName);
        applyTheme(savedTheme as ThemeName);
      } else {
        // Set default theme
        applyTheme('yellow');
      }
    }
    // Force reflow on the page to ensure the CSS variables are applied
    if (typeof document !== 'undefined') {
      const reflow = document.body.offsetHeight;
    }
  }, []);

  // Update theme when state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    console.log(`Setting theme to: ${newTheme}`);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('writePad-theme', newTheme);
    }
    
    // Update state
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 