"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TiltButton } from "@/components/TiltButton";

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/signin";
      const body = isSignUp
        ? { username, password, name, email }
        : { username, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred");
        return;
      }

      // Success - redirect to home
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 animate-in fade-in-0 duration-1000">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md p-8 shadow-xl animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
        <div className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center animate-in fade-in-0 zoom-in-95 duration-500" style={{ animationDelay: '200ms' }}>
            <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 animate-in fade-in-0 slide-in-from-top-4 duration-500" style={{ animationDelay: '300ms' }}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-slate-600 animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
            {isSignUp
              ? "Start with $1,000 virtual cash to trade stocks"
              : "Sign in to continue your trading journey"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in-0 duration-700" style={{ animationDelay: '500ms' }}>
          {isSignUp && (
            <>
              <div className="animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '600ms' }}>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '650ms' }}>
                  Full Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-slate-400 animate-in fade-in-0 slide-in-from-right-2 duration-500"
                  placeholder="Enter your full name"
                  style={{ animationDelay: '700ms' }}
                />
              </div>

              <div className="animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '750ms' }}>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '800ms' }}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-slate-400 animate-in fade-in-0 slide-in-from-right-2 duration-500"
                  placeholder="Enter your email address"
                  required
                  style={{ animationDelay: '850ms' }}
                />
              </div>
            </>
          )}

          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: isSignUp ? '900ms' : '600ms' }}>
            <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2 animate-in fade-in-0 duration-300" style={{ animationDelay: isSignUp ? '950ms' : '650ms' }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-slate-400 animate-in fade-in-0 slide-in-from-right-2 duration-500"
              placeholder="Enter your username"
              required
              style={{ animationDelay: isSignUp ? '1000ms' : '700ms' }}
            />
          </div>

          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: isSignUp ? '1050ms' : '750ms' }}>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2 animate-in fade-in-0 duration-300" style={{ animationDelay: isSignUp ? '1100ms' : '800ms' }}>
              Password {isSignUp && <span className="text-slate-400 font-normal">(min. 6 characters)</span>}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-slate-400 animate-in fade-in-0 slide-in-from-right-2 duration-500"
              placeholder="Enter your password"
              required
              minLength={6}
              style={{ animationDelay: isSignUp ? '1150ms' : '850ms' }}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium animate-in fade-in-0 duration-300" style={{ animationDelay: '100ms' }}>{error}</p>
              </div>
            </div>
          )}

          <TiltButton
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: isSignUp ? '1200ms' : '900ms' }}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span className={loading ? 'animate-pulse' : ''}>
              {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
            </span>
          </TiltButton>
        </form>

        <div className="text-center pt-4 border-t border-slate-200 animate-in fade-in-0 duration-500" style={{ animationDelay: isSignUp ? '1300ms' : '1000ms' }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-slate-600 hover:text-blue-600 font-medium transition-all duration-200 hover:scale-105 relative overflow-hidden group"
          >
            <span className="relative z-10">
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"
              }
            </span>
            <div className="absolute inset-0 bg-blue-50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
