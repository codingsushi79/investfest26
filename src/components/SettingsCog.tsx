"use client";

import { useState, useEffect } from "react";

export function SettingsCog() {
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check initial theme
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDark(initialDark);
    updateTheme(initialDark);

    // Apply initial theme to document
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setIsDark(e.matches);
        updateTheme(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const updateTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    updateTheme(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");

    // Force re-render by updating state
    setIsDark(newDark);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Settings Menu */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 p-4 min-w-[200px] animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Settings
            </h3>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Dark Mode
              </span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 ${
                  isDark ? "bg-zinc-900 dark:bg-zinc-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-100 transition-transform ${
                    isDark ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Theme Status */}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              Current: {isDark ? "Dark" : "Light"} Mode
            </div>
          </div>

          {/* Arrow pointing down */}
          <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-zinc-800"></div>
        </div>
      )}

      {/* Cog Button */}
      <button
        onClick={toggleMenu}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 ${
          isOpen
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
            : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
        }`}
        aria-label="Settings"
      >
        {/* Cog Icon */}
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-90" : "group-hover:rotate-12"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>

        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Settings
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
          </div>
        )}
      </button>

      {/* Backdrop for closing menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
