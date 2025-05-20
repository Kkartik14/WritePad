import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";
import Script from 'next/script';
import { ThemeInitializer } from "../components/ThemeInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WritePad - Beautiful Note Taking",
  description: "A beautiful, intuitive writing app with AI-powered features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="afterInteractive">
          {`
            (function() {
              try {
                // Check localStorage for saved theme
                const savedTheme = localStorage.getItem('writePad-theme');
                if (savedTheme && ['yellow', 'blue', 'black', 'white'].includes(savedTheme)) {
                  // Remove any existing theme classes first
                  document.documentElement.classList.remove('theme-yellow', 'theme-blue', 'theme-black', 'theme-white');
                  // Apply the theme
                  document.documentElement.classList.add('theme-' + savedTheme);
                  
                  // Apply critical CSS variables directly
                  const themeColors = {
                    yellow: {
                      background: '#F8F2D8',
                      foreground: '#000000',
                      sidebarBg: '#F5E5B0',
                      borderColor: '#D0B56F'
                    },
                    blue: {
                      background: '#EFF6FF',
                      foreground: '#1E3A8A',
                      sidebarBg: '#DBEAFE',
                      borderColor: '#93C5FD'
                    },
                    black: {
                      background: '#121212',
                      foreground: '#FFFFFF',
                      sidebarBg: '#1E1E1E',
                      borderColor: '#333333'
                    },
                    white: {
                      background: '#FFFFFF',
                      foreground: '#000000',
                      sidebarBg: '#F5F5F7',
                      borderColor: '#E0E0E0'
                    }
                  };
                  
                  // Apply CSS variables directly to ensure immediate visual consistency
                  const colors = themeColors[savedTheme];
                  if (colors) {
                    document.documentElement.style.setProperty('--background', colors.background);
                    document.documentElement.style.setProperty('--foreground', colors.foreground);
                    document.documentElement.style.setProperty('--sidebar-bg', colors.sidebarBg);
                    document.documentElement.style.setProperty('--border-color', colors.borderColor);
                    document.documentElement.style.setProperty('--editor-bg', colors.background);
                  }
                  
                  console.log('Applied theme from localStorage:', savedTheme);
                } else {
                  // Default to yellow theme if no theme is set
                  document.documentElement.classList.add('theme-yellow');
                }
              } catch (e) {
                console.error('Error initializing theme:', e);
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ThemeInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
