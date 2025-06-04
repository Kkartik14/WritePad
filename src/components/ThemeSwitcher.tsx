'use client';

import React, { useState, useEffect } from 'react';
import { Palette, Bug, MoonStar, Sun } from 'lucide-react';
import { useTheme, ThemeName } from '../context/ThemeContext';
import { checkAppliedTheme, checkCssVariables, forceApplyTheme } from '../utils/themeDebugger';

export const ThemeSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isDev, setIsDev] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(theme);

  // Check if we're in development environment
  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);

  // Update current theme state when theme context changes
  useEffect(() => {
    setCurrentTheme(theme);
    console.log('Current theme in switcher:', theme);
    
    // Check if the theme is correctly applied
    setTimeout(() => {
      checkAppliedTheme();
      checkCssVariables();
    }, 100);
  }, [theme]);

  const themes = [
    { name: 'yellow', label: 'Papyrus', colorClass: 'yellow-color' },
    { name: 'blue', label: 'Ocean', colorClass: 'blue-color' },
    { name: 'black', label: 'Midnight', colorClass: 'black-color' },
    { name: 'white', label: 'Minimal', colorClass: 'white-color' },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const changeTheme = (newTheme: ThemeName) => {
    console.log(`Changing theme from ${theme} to ${newTheme}`);
    
    // Update state early for immediate UI feedback
    setCurrentTheme(newTheme);
    
    // Apply theme to context
    setTheme(newTheme);
    
    // Also force apply the theme directly to ensure it takes effect
    forceApplyTheme(newTheme);
    
    // Force a reflow to make sure styles are recalculated
    if (typeof document !== 'undefined') {
      const reflow = document.body.offsetHeight;
    }
    
    // Close menu
    setIsOpen(false);
    
    // Double-check application after a delay
    setTimeout(() => {
      const appliedThemes = checkAppliedTheme();
      if (!appliedThemes.includes(`theme-${newTheme}`)) {
        console.warn(`Theme ${newTheme} not properly applied, forcing again`);
        forceApplyTheme(newTheme);
      }
    }, 200);
  };

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  // Debug button to quickly toggle between light/dark
  const quickToggleTheme = () => {
    const newTheme = theme === 'black' ? 'yellow' : 'black';
    changeTheme(newTheme);
  };

  // Debug button to forcefully check theme
  const debugTheme = () => {
    const currentThemes = checkAppliedTheme();
    checkCssVariables();
    
    if (currentThemes.length === 0) {
      alert('No theme class is applied! Forcing theme: ' + theme);
      forceApplyTheme(theme);
    } else if (currentThemes.length > 1) {
      alert(`Multiple themes detected: ${currentThemes.join(', ')}. Fixing to use: ${theme}`);
      forceApplyTheme(theme);
    } else {
      alert(`Current theme class: ${currentThemes[0]}\nCurrent theme state: ${theme}\nCheck console for CSS variables.`);
      
      // If class doesn't match state, correct it
      if (currentThemes[0] !== `theme-${theme}`) {
        if (confirm(`Theme mismatch detected! Class: ${currentThemes[0]}, State: ${theme}. Do you want to correct it?`)) {
          forceApplyTheme(theme);
        }
      }
    }
  };

  return (
    <div className="theme-switcher relative">
      <div className="flex items-center">
        {isDev && (
          <button
            onClick={debugTheme}
            className="toolbar-button p-2 rounded text-[var(--text-muted)] hover:bg-[var(--hover-bg)] mr-1"
            title="Debug Theme"
          >
            <Bug className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={quickToggleTheme}
          className="toolbar-button p-2 rounded text-[var(--text-muted)] hover:bg-[var(--hover-bg)] mr-1"
          title={theme === 'black' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'black' ? <Sun className="w-5 h-5" /> : <MoonStar className="w-5 h-5" />}
        </button>
        
        <button
          onClick={toggleMenu}
          className="toolbar-button p-2 rounded text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          title="Change Theme"
        >
          <Palette className="w-5 h-5" />
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleClickOutside}
            aria-hidden="true"
          ></div>
          <div className="absolute right-0 top-full mt-2 bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 w-52 py-2">
            <div className="text-sm font-medium mb-2 text-[var(--text-muted)] px-3">
              Choose Theme
            </div>
            {themes.map((themeOption) => (
              <div
                key={themeOption.name}
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[var(--hover-bg)] ${
                  currentTheme === themeOption.name ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--foreground)]'
                }`}
                onClick={() => changeTheme(themeOption.name as ThemeName)}
              >
                <span 
                  className="w-4 h-4 rounded-full mr-2 border flex-shrink-0" 
                  style={{
                    backgroundColor: 
                      themeOption.name === 'yellow' ? '#F5E5B0' :
                      themeOption.name === 'blue' ? '#DBEAFE' :
                      themeOption.name === 'black' ? '#121212' : '#FFFFFF',
                    borderColor: 'var(--border-color)'
                  }}
                ></span>
                <span>{themeOption.label}</span>
                {currentTheme === themeOption.name && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}; 