"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConsolePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);
  const consoleEl = useRef<HTMLDivElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user is operator
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          const opUsername = process.env.NEXT_PUBLIC_OP_USERNAME || "operator";
          const isOp = data.user.username === opUsername;
          setIsOperator(isOp);
          if (!isOp) {
            router.push("/");
          }
        } else {
          router.push("/signin");
        }
      })
      .catch(() => {
        router.push("/signin");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (isOperator && consoleEl.current) {
      // Initial welcome message
      addOutput('Welcome to InvestFest Console! Type "help" for available commands.', 'info');
      addOutput('Real-time transaction and price update logging is active.', 'info');
      if (inputEl.current) {
        inputEl.current.focus();
      }
      connectEventSource();
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    }
  }, [isOperator]);

  const addOutput = (text: string, className: string = "") => {
    if (!consoleEl.current) return;
    const div = document.createElement("div");
    div.className = "output " + className;
    div.innerHTML = text;
    consoleEl.current.appendChild(div);
    consoleEl.current.scrollTop = consoleEl.current.scrollHeight;
  };

  const addPrompt = (command: string) => {
    addOutput("&gt; " + command, "prompt");
  };

  const formatLog = (data: any) => {
    const time = new Date(data.timestamp).toLocaleTimeString();
    switch (data.type) {
      case "transaction":
        const action = data.action === "BUY" ? "🟢 BUY" : "🔴 SELL";
        return `[${time}] ${action} - ${data.username} | ${data.symbol} (${data.shares} shares @ $${data.price.toFixed(2)}) = $${data.total.toFixed(2)}`;
      case "price_update":
        return `[${time}] 💰 PRICE UPDATE - ${data.symbol} (${data.label}): $${data.value.toFixed(2)}`;
      case "query":
        const queryType = data.query.match(/(INSERT|UPDATE|DELETE)/)?.[0] || "QUERY";
        return `[${time}] 🔧 DB ${queryType} (${data.duration}ms)`;
      default:
        return `[${time}] ${JSON.stringify(data)}`;
    }
  };

  const connectEventSource = () => {
    const eventSource = new EventSource("/api/console/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus("● Connected");
    };

    eventSource.onerror = () => {
      setStatus("○ Disconnected");
      setTimeout(connectEventSource, 3000);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addOutput(formatLog(data), "log " + data.type);
      } catch (e) {
        console.error("Error parsing log:", e);
      }
    };
  };

  const executeCommand = async () => {
    if (!inputEl.current) return;
    const command = inputEl.current.value.trim();
    if (!command) return;

    commandHistory.current.push(command);
    historyIndex.current = commandHistory.current.length;
    addPrompt(command);
    inputEl.current.value = "";

    try {
      const res = await fetch("/api/console/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await res.json();
      if (data.error) {
        addOutput("Error: " + data.error, "error");
      } else {
        if (typeof data.result === "string") {
          // For help and other text output, preserve line breaks and escape HTML
          const escaped = data.result
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          // Check if it's help output (starts with "Available commands")
          if (data.result.trim().startsWith("Available commands")) {
            addOutput(`<pre class="help-output">${escaped}</pre>`, data.success ? "success" : "info");
          } else if (data.result.trim().startsWith("User:")) {
            // User command output - format with better styling
            addOutput(`<pre class="user-output">${escaped}</pre>`, data.success ? "success" : "info");
          } else {
            addOutput(`<pre>${escaped}</pre>`, data.success ? "success" : "info");
          }
        } else {
          addOutput("<pre>" + JSON.stringify(data.result, null, 2) + "</pre>", data.success ? "success" : "info");
        }
      }
    } catch (err: any) {
      addOutput("Error: " + err.message, "error");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand();
    }
  };

  const fetchAutocomplete = async (input: string) => {
    if (!input.trim()) {
      setAutocompleteSuggestions([]);
      return;
    }

    try {
      const res = await fetch("/api/console/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setAutocompleteSuggestions(data.suggestions);
        setAutocompleteIndex(-1);
      }
    } catch (err) {
      // Silently fail
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Fetch autocomplete after a short delay
    autocompleteTimeoutRef.current = setTimeout(() => {
      fetchAutocomplete(value);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle autocomplete navigation
    if (autocompleteSuggestions.length > 0) {
      if (e.key === "Tab") {
        e.preventDefault();
        if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteSuggestions.length) {
          const suggestion = autocompleteSuggestions[autocompleteIndex];
          if (inputEl.current) {
            const parts = inputEl.current.value.trim().split(/\s+/);
            if (parts.length > 1) {
              parts[parts.length - 1] = suggestion;
              inputEl.current.value = parts.join(" ") + " ";
            } else {
              inputEl.current.value = suggestion + " ";
            }
            setAutocompleteSuggestions([]);
            setAutocompleteIndex(-1);
          }
        } else if (autocompleteSuggestions.length > 0) {
          // Use first suggestion
          const suggestion = autocompleteSuggestions[0];
          if (inputEl.current) {
            const parts = inputEl.current.value.trim().split(/\s+/);
            if (parts.length > 1) {
              parts[parts.length - 1] = suggestion;
              inputEl.current.value = parts.join(" ") + " ";
            } else {
              inputEl.current.value = suggestion + " ";
            }
            setAutocompleteSuggestions([]);
            setAutocompleteIndex(-1);
          }
        }
        return;
      } else if (e.key === "ArrowRight" && autocompleteIndex >= 0) {
        e.preventDefault();
        const suggestion = autocompleteSuggestions[autocompleteIndex];
        if (inputEl.current) {
          const parts = inputEl.current.value.trim().split(/\s+/);
          if (parts.length > 1) {
            parts[parts.length - 1] = suggestion;
            inputEl.current.value = parts.join(" ") + " ";
          } else {
            inputEl.current.value = suggestion + " ";
          }
          setAutocompleteSuggestions([]);
          setAutocompleteIndex(-1);
        }
        return;
      }
    }

    // Handle command history
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteSuggestions([]); // Clear autocomplete when using history
      if (historyIndex.current > 0) {
        historyIndex.current--;
        if (inputEl.current) {
          inputEl.current.value = commandHistory.current[historyIndex.current];
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteSuggestions([]); // Clear autocomplete when using history
      if (historyIndex.current < commandHistory.current.length - 1) {
        historyIndex.current++;
        if (inputEl.current) {
          inputEl.current.value = commandHistory.current[historyIndex.current];
        }
      } else {
        historyIndex.current = commandHistory.current.length;
        if (inputEl.current) {
          inputEl.current.value = "";
        }
      }
    } else if (e.key === "Escape") {
      setAutocompleteSuggestions([]);
      setAutocompleteIndex(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isOperator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4] p-5">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2.5rem)] flex flex-col">
        <div className="header mb-5 pb-2.5 border-b border-[#3e3e3e] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#4ec9b0] hover:text-[#6ed4c0] transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-[#4ec9b0] text-2xl">🚀 InvestFest Console</h1>
          </div>
          <div className={`text-xs ${status.includes("Connected") ? "text-[#4ec9b0]" : "text-[#858585]"}`}>
            {status}
          </div>
        </div>

        <div
          ref={consoleEl}
          className="console flex-1 bg-[#252526] border border-[#3e3e3e] rounded p-4 mb-4 overflow-y-auto text-sm leading-relaxed"
        />

        <div className="input-container flex gap-2.5 relative">
          <div className="flex-1 relative">
            <input
              ref={inputEl}
              type="text"
              placeholder="Enter command (type 'help' for commands)"
              autoComplete="off"
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyDown}
              onChange={handleInputChange}
              className="w-full bg-[#252526] border border-[#3e3e3e] text-[#d4d4d4] p-2.5 rounded font-mono text-sm focus:outline-none focus:border-[#4ec9b0]"
            />
            {autocompleteSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#252526] border border-[#3e3e3e] rounded max-h-48 overflow-y-auto z-10">
                {autocompleteSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (inputEl.current) {
                        const parts = inputEl.current.value.trim().split(/\s+/);
                        if (parts.length > 1) {
                          parts[parts.length - 1] = suggestion;
                          inputEl.current.value = parts.join(" ") + " ";
                        } else {
                          inputEl.current.value = suggestion + " ";
                        }
                        setAutocompleteSuggestions([]);
                        setAutocompleteIndex(-1);
                        inputEl.current.focus();
                      }
                    }}
                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-[#2d2d30] ${
                      idx === autocompleteIndex ? "bg-[#2d2d30]" : ""
                    }`}
                    onMouseEnter={() => setAutocompleteIndex(idx)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={executeCommand}
            className="bg-[#0e639c] text-white border-none px-5 py-2.5 rounded cursor-pointer font-mono text-sm hover:bg-[#1177bb]"
          >
            Execute
          </button>
        </div>

        <div className="help mt-2.5 p-2.5 bg-[#1e1e1e] rounded text-xs text-[#858585]">
          <strong>Tip:</strong> Use arrow keys to navigate command history. Commands are
          case-insensitive. Real-time logs appear automatically.
        </div>
      </div>

      <style jsx>{`
        .output {
          margin-bottom: 10px;
        }
        .output.prompt {
          color: #4ec9b0;
        }
        .output.success {
          color: #4ec9b0;
        }
        .output.error {
          color: #f48771;
        }
        .output.info {
          color: #9cdcfe;
        }
        .output.log {
          color: #ce9178;
          font-size: 12px;
          padding-left: 10px;
          border-left: 2px solid #3e3e3e;
        }
        .output.log.transaction {
          border-left-color: #4ec9b0;
        }
        .output.log.price_update {
          border-left-color: #dcdcaa;
        }
        .output.log.query {
          border-left-color: #569cd6;
        }
        .output pre {
          background: #1e1e1e;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          margin-top: 5px;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          line-height: 1.6;
        }
        .output pre.help-output {
          background: transparent;
          padding: 0;
          margin: 0;
          white-space: pre;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          line-height: 1.8;
        }
        .output pre.user-output {
          background: transparent;
          padding: 0;
          margin: 0;
          white-space: pre;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          line-height: 1.8;
        }
        .output pre.user-output {
          color: #4ec9b0;
        }
      `}</style>
    </div>
  );
}

