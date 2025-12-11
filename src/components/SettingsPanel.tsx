"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "auto";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isOperator?: boolean;
}

export function SettingsPanel({ isOpen, onClose, isOperator = false }: SettingsPanelProps & { isOperator?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [animations, setAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [tradingEnded, setTradingEnded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("investfest-theme") as Theme;
    const savedAnimations = localStorage.getItem("investfest-animations");
    const savedCompact = localStorage.getItem("investfest-compact");
    const savedTradingEnded = localStorage.getItem("investfest-trading-ended");

    if (savedTheme) setTheme(savedTheme);
    if (savedAnimations !== null) setAnimations(savedAnimations === "true");
    if (savedCompact !== null) setCompactMode(savedCompact === "true");
    if (savedTradingEnded !== null) setTradingEnded(savedTradingEnded === "true");
  }, []);

  // Apply theme changes
  useEffect(() => {
    localStorage.setItem("investfest-theme", theme);

    const root = document.documentElement;
    root.classList.remove("light", "dark", "auto");

    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Save other settings
  useEffect(() => {
    localStorage.setItem("investfest-animations", animations.toString());
    localStorage.setItem("investfest-compact", compactMode.toString());
    localStorage.setItem("investfest-trading-ended", tradingEnded.toString());
  }, [animations, compactMode, tradingEnded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Theme Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Light", icon: "☀️" },
                  { value: "dark", label: "Dark", icon: "🌙" },
                  { value: "auto", label: "Auto", icon: "🌓" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as Theme)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Other Settings */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Preferences</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Animations</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Enable smooth transitions and effects</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animations}
                      onChange={(e) => setAnimations(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Compact Mode</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Reduce spacing and padding</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Operator Controls */}
            {isOperator && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Operator Controls</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">End Trading Event</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Permanently disable trading and show final rankings
                      </div>
                    </div>
                    <button
                      onClick={() => setTradingEnded(true)}
                      disabled={tradingEnded}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        tradingEnded
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {tradingEnded ? "Event Ended" : "End Event"}
                    </button>
                  </div>

                  {tradingEnded && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Trading event has ended!</strong> Users can no longer trade and final rankings are displayed.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Account</h3>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Manage your account settings in your profile or contact support for assistance.
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
