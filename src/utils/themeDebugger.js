/**
 * Theme debugger utility
 * This file contains functions to help debug theme-related issues
 */

// Theme color definitions for direct application
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
    selectedBg: '#F0F0F0',
    selectedFg: '#000000'
  }
};

// Helper function to convert camelCase to kebab-case
function camelToKebab(string) {
  return string.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Check what theme classes are applied to the HTML element
export function checkAppliedTheme() {
  if (typeof document !== 'undefined') {
    const htmlEl = document.documentElement;
    const appliedClasses = htmlEl.className;
    console.log('Applied classes on HTML element:', appliedClasses);
    
    // Check if any theme class is applied
    const themeClasses = ['theme-yellow', 'theme-blue', 'theme-black', 'theme-white'];
    const appliedThemes = themeClasses.filter(cls => htmlEl.classList.contains(cls));
    
    if (appliedThemes.length === 0) {
      console.warn('No theme class is applied to HTML element');
    } else if (appliedThemes.length > 1) {
      console.warn('Multiple theme classes are applied:', appliedThemes);
    } else {
      console.log('Current theme:', appliedThemes[0]);
    }
    
    return appliedThemes;
  }
  return [];
}

// Force apply a theme class and directly set CSS variables
export function forceApplyTheme(themeName) {
  if (typeof document !== 'undefined') {
    const htmlEl = document.documentElement;
    
    // Remove all theme classes
    htmlEl.classList.remove('theme-yellow', 'theme-blue', 'theme-black', 'theme-white');
    
    // Add the specified theme
    htmlEl.classList.add(`theme-${themeName}`);
    
    // Apply CSS variables directly as inline styles
    const colors = themeColors[themeName];
    if (colors) {
      Object.entries(colors).forEach(([key, value]) => {
        const cssVarName = camelToKebab(key);
        htmlEl.style.setProperty(`--${cssVarName}`, value);
      });
      
      // Force a reflow 
      const reflow = document.body.offsetHeight;
      
      // Try to apply to any iframes as well
      try {
        Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
          try {
            if (iframe.contentDocument) {
              iframe.contentDocument.documentElement.classList.add(`theme-${themeName}`);
              Object.entries(colors).forEach(([key, value]) => {
                const cssVarName = camelToKebab(key);
                iframe.contentDocument.documentElement.style.setProperty(`--${cssVarName}`, value);
              });
            }
          } catch (e) {
            // Cross-origin iframe access might fail
          }
        });
      } catch (e) {
        console.error('Error applying theme to iframes:', e);
      }
    }
    
    console.log(`Forcefully applied theme: theme-${themeName}`);
    return true;
  }
  return false;
}

// Check if CSS variables are being correctly applied
export function checkCssVariables() {
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const computedStyle = window.getComputedStyle(document.documentElement);
    const variables = [
      '--background',
      '--foreground', 
      '--sidebar-bg',
      '--border-color',
      '--hover-bg',
      '--editor-bg',
      '--text-muted',
      '--toolbar-bg',
      '--modal-bg',
      '--accent-color',
      '--accent-hover',
      '--selected-bg',
      '--selected-fg'
    ];
    
    console.log('CSS Variables:');
    const values = {};
    variables.forEach(variable => {
      const value = computedStyle.getPropertyValue(variable);
      values[variable] = value;
      console.log(`${variable}: ${value}`);
    });
    
    return values;
  }
  return null;
} 