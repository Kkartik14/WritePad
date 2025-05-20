'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { checkAppliedTheme, forceApplyTheme, checkCssVariables } from '../utils/themeDebugger';

export const ThemeInitializer = () => {
  const { theme } = useTheme();
  const initialized = useRef(false);

  // Apply theme on component mount and whenever theme changes in context
  useEffect(() => {
    console.log('ThemeInitializer: Applying theme', theme);
    
    // Force apply theme
    forceApplyTheme(theme);
    
    // Check if it was correctly applied
    setTimeout(() => {
      const appliedThemes = checkAppliedTheme();
      const cssVars = checkCssVariables();
      
      // If no theme is applied or doesn't match our theme, try again
      if (appliedThemes.length === 0 || !appliedThemes.includes(`theme-${theme}`)) {
        console.warn('Theme not applied correctly. Trying again...');
        forceApplyTheme(theme);
      }
      
      // Mark as initialized
      initialized.current = true;
    }, 100);
  }, [theme]);
  
  // Extra initialization check for page changes/route changes
  useEffect(() => {
    const handleRouteChange = () => {
      if (initialized.current) {
        console.log('Route changed, ensuring theme is applied');
        forceApplyTheme(theme);
      }
    };
    
    // Allow time for the app to stabilize then check if theme is applied correctly
    const timeout = setTimeout(() => {
      const appliedThemes = checkAppliedTheme();
      if (appliedThemes.length === 0) {
        console.warn('No theme detected after initialization. Applying theme again.');
        forceApplyTheme(theme);
      }
    }, 1000);
    
    // Add a mutation observer to detect DOM changes that might affect theme
    if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        // Check for significant DOM changes that might require re-applying the theme
        const significantChanges = mutations.some(mutation => 
          mutation.type === 'childList' && 
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && 
            ((node as Element).tagName === 'DIV' || (node as Element).tagName === 'MAIN')
          )
        );
        
        if (significantChanges && initialized.current) {
          console.log('Significant DOM changes detected, ensuring theme is applied');
          forceApplyTheme(theme);
        }
      });
      
      // Start observing the document body for changes
      observer.observe(document.body, { 
        childList: true,
        subtree: true 
      });
      
      return () => {
        clearTimeout(timeout);
        observer.disconnect();
      };
    }
    
    return () => clearTimeout(timeout);
  }, [theme]);

  // Invisible component that just handles theme application
  return null;
}; 