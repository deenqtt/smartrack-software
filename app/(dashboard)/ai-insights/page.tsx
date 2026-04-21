"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  User,
  Users,
  Cpu,
  Zap,
  Sparkles,
  Activity,
  ShieldCheck,
  Database,
  Info,
  Trash2,
  Plus,
  MessageSquare,
  Menu,
  X,
  Copy,
  Check,
  SquareTerminal,
  Bot as BotIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function AIInsightsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessage = (): Message => ({
    role: "assistant",
    content:
      "Hello! I am your **SmartAssistant**. Specialized in **Smart Rack & Infrastructure** analytics. How can I help you today?",
    timestamp: new Date(),
  });

  const createNewSession = () => {
    const newSession: ChatSession = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString() + Math.random().toString(36).substring(2, 9),
      title: "New Conversation",
      messages: [initialMessage()],
      createdAt: new Date(),
    };
    setSessions((prev) => {
      // Prevent duplicate creation if one already exists with same title/messages in immediate prev
      if (
        prev.length > 0 &&
        prev[0].title === "New Conversation" &&
        prev[0].messages.length === 1
      ) {
        return prev;
      }
      return [newSession, ...prev];
    });
    setActiveSessionId(newSession.id);
    return newSession;
  };

  useEffect(() => {
    setMounted(true);
    const savedSessions = localStorage.getItem("smartrack_ai_sessions");
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const restored = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));

        // Deduplicate by ID
        const uniqueSessions = restored.filter(
          (s: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.id === s.id),
        );

        setSessions(uniqueSessions);
        if (uniqueSessions.length > 0) {
          setActiveSessionId(uniqueSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (mounted && sessions.length > 0) {
      localStorage.setItem("smartrack_ai_sessions", JSON.stringify(sessions));
    }
  }, [sessions, mounted]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading || !activeSessionId) return;

    const userMessage = input.trim();
    setInput("");

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const newMessages: Message[] = [
            ...s.messages,
            {
              role: "user",
              content: userMessage,
              timestamp: new Date(),
            },
          ];
          // Update title if it's the first real user message
          let newTitle = s.title;
          if (s.title === "New Conversation") {
            newTitle =
              userMessage.length > 30
                ? userMessage.substring(0, 30) + "..."
                : userMessage;
          }
          return { ...s, messages: newMessages, title: newTitle };
        }
        return s;
      }),
    );

    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      if (data.content) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    role: "assistant",
                    content: data.content,
                    timestamp: new Date(),
                  },
                ],
              };
            }
            return s;
          }),
        );
      }
    } catch (error) {
      console.error("AI Error:", error);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  role: "assistant",
                  content:
                    "🚨 **SYSTEM ERROR:** Failed to connect to AI services.",
                  timestamp: new Date(),
                },
              ],
            };
          }
          return s;
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      setSessions([
        {
          id: Date.now().toString(),
          title: "New Conversation",
          messages: [initialMessage()],
          createdAt: new Date(),
        },
      ]);
      setSessionToDelete(null);
      return;
    }

    const newSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(newSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id);
    }
    setSessionToDelete(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: "Data successfully copied.",
      duration: 2000,
    });
  };

  const renderContent = (content: string, role: string) => {
    return (
      <div className="markdown-body space-y-4 font-medium break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            strong: ({ node, ...props }) => (
              <strong
                className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded ${role === "user" ? "bg-black/10" : "bg-primary/10 text-primary"}`}
                {...props}
              />
            ),
            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 whitespace-pre-line" {...props} />,
            table: ({ node, ...props }) => (
              <div className="my-4 overflow-x-auto border border-primary/10 rounded-xl bg-card">
                <table className="w-full text-left text-sm whitespace-nowrap" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-primary/5 border-b border-primary/10" {...props} />,
            tr: ({ node, ...props }) => <tr className="hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0" {...props} />,
            th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold text-primary" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 text-muted-foreground" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
            code: ({ node, inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = inline || !match;
              const contentString = String(children).replace(/\n$/, "");

              if (isInline) {
                return (
                  <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[11px] font-mono" {...props}>
                    {children}
                  </code>
                );
              }

              return (
                <div className="my-4 relative group/code w-full">
                  <div className="absolute right-3 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-background/80 backdrop-blur-md border border-primary/20 hover:bg-primary/20 text-primary shadow-xl"
                      onClick={() => copyToClipboard(contentString)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <SquareTerminal className="w-3 h-3 text-primary/50" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">
                        {match ? match[1] : "code"}
                      </span>
                    </div>
                  </div>
                  <pre className="bg-black/20 p-5 overflow-x-auto rounded-b-2xl border border-t-0 border-primary/10 text-[12px] font-mono leading-relaxed custom-scrollbar text-foreground/90">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const suggestions = [
    { label: "Check system health", icon: <Zap className="w-3.5 h-3.5" /> },
    {
      label: "Analyze IoT device logs",
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      label: "Security audit overview",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    {
      label: "Network connectivity report",
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
  ];

  const applySuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <TooltipProvider>
      <main className="flex h-[calc(100vh-64px)] overflow-hidden bg-background/50 backdrop-blur-3xl relative">
        {/* Background Aesthetics */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[0%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
        </div>

        {/* Left Sidebar (Gemini Style) */}
        <div
          className={`${sidebarOpen ? "w-72" : "w-0 opacity-0 invisible"} transition-all duration-500 border-r border-primary/5 bg-card/20 backdrop-blur-xl flex flex-col sticky top-0 shrink-0 overflow-hidden h-full z-10`}
        >
          <div className="p-6 flex flex-col h-full">
            <Button
              onClick={createNewSession}
              className="w-full justify-start gap-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10 rounded-2xl h-12 mb-8 transition-all hover:scale-[1.02] shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">
                New Session
              </span>
            </Button>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-4 px-2">
                Recent Analytics
              </h3>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all cursor-pointer group relative ${activeSessionId === s.id
                    ? "bg-primary/10 border border-primary/10 text-primary"
                    : "hover:bg-primary/5 border border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === s.id ? "text-primary" : "opacity-40"}`}
                  />
                  <span className="text-xs font-bold truncate flex-1">
                    {s.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-500/50 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative h-full overflow-hidden">
          {/* Simplified Header */}
          <header className="h-16 border-b border-primary/5 px-8 flex items-center justify-between backdrop-blur-md bg-background/20 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="hover:bg-primary/10"
                >
                  <Menu className="w-4 h-4 text-primary" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-sm font-black tracking-tight uppercase">
                  Smart<span className="text-primary">Assistant</span>
                </h2>
                <Badge
                  variant="outline"
                  className="text-[8px] font-black py-0 h-4 bg-green-500/5 text-green-500 border-green-500/10"
                >
                  V3.0
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-card/40 border border-primary/5 rounded-full shadow-sm">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter leading-none">
                    Latency
                  </span>
                  <span className="text-[10px] font-bold text-primary">
                    38ms
                  </span>
                </div>
                <div className="w-[1px] h-4 bg-primary/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter leading-none">
                    Status
                  </span>
                  <span className="text-[10px] font-bold text-green-500">
                    LIVE
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </Button>
            </div>
          </header>

          {/* Chat Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar scroll-smooth"
          >
            <div className="max-w-5xl mx-auto space-y-12 pb-32">
              {messages.length <= 1 && (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-primary/10 group hover:scale-110 transition-transform duration-500">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <h1 className="text-4xl font-black text-center mb-4 tracking-tighter bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                    Hello. How can I assist with your{" "}
                    <span className="text-primary">Smart Rack IOT</span>{" "}
                    today?
                  </h1>
                  <p className="text-muted-foreground text-sm font-medium mb-12 max-w-md text-center opacity-70">
                    Advanced AI analysis for scaleable IoT systems.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => applySuggestion(s.label)}
                        className="group flex flex-col gap-2 p-4 bg-card/40 border border-primary/5 rounded-[1.5rem] hover:border-primary/20 hover:bg-primary/5 transition-all text-left shadow-sm hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="p-2 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/20 transition-colors">
                          {s.icon}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-500`}
                >
                  <div
                    className={`flex gap-4 w-full max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border transition-transform hover:scale-110 ${m.role === "user"
                        ? "bg-gradient-to-br from-primary to-blue-600 border-white/20 text-white"
                        : "bg-card border-primary/5 text-primary"
                        }`}
                    >
                      {m.role === "user" ? (
                        <User className="w-5 h-5 shadow-sm" />
                      ) : (
                        <BotIcon className="w-5 h-5 shadow-sm" />
                      )}
                    </div>
                    <div className={`space-y-2 flex flex-col ${m.role === "user" ? "items-end" : "items-start"} min-w-0 flex-1`}>
                      <div
                        className={`px-2 py-1 flex items-center gap-2`}
                      >
                        <span className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-[0.2em]">
                          {m.role === "user" ? "USER" : "SmartAssistant"}
                        </span>
                      </div>
                      <div
                        className={`px-6 py-4 rounded-[2rem] text-sm leading-[1.7] shadow-sm border group/message relative w-fit max-w-full overflow-x-auto break-words custom-scrollbar ${m.role === "user"
                          ? "bg-primary text-primary-foreground border-white/5 rounded-tr-none"
                          : "bg-card/60 text-foreground border-primary/5 rounded-tl-none backdrop-blur-xl"
                          }`}
                      >
                        {/* Copy Full Message Button */}
                        <div
                          className={`absolute -top-3 ${m.role === "user" ? "-left-3" : "-right-3"} opacity-0 group-hover/message:opacity-100 transition-all duration-300 transform scale-75 group-hover/message:scale-100`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(m.content)}
                            className="h-8 w-8 bg-background/80 backdrop-blur-2xl border-2 border-primary/20 hover:bg-primary/10 text-primary rounded-2xl shadow-2xl"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {renderContent(m.content, m.role)}
                        </div>
                      </div>
                      <div
                        className={`px-4 text-[9px] font-black text-muted-foreground uppercase opacity-20 tracking-widest ${m.role === "user" ? "text-right" : "text-left"}`}
                      >
                        {mounted &&
                          m.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-in fade-in duration-500">
                  <div className="flex gap-4 w-full max-w-[85%] flex-row">
                    <div className="w-10 h-10 rounded-2xl bg-card border border-primary/5 flex items-center justify-center shrink-0 shadow-lg">
                      <BotIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-2 flex flex-col items-start min-w-0 flex-1">
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-[0.2em]">
                          SmartAssistant
                        </span>
                      </div>
                      <div className="px-6 py-4 bg-card/60 border border-primary/5 rounded-[2rem] rounded-tl-none flex items-center gap-2 shadow-sm w-fit max-w-full overflow-x-auto backdrop-blur-xl">
                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse" />
                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse delay-75" />
                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating Input Pill */}
          <div className="absolute bottom-10 left-0 w-full px-4 md:px-0">
            <div className="max-w-5xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-600 to-primary rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-30 transition duration-1000" />
              <div className="relative flex items-center bg-card/80 backdrop-blur-2xl border-2 border-primary/10 rounded-[2.5rem] p-2 shadow-2xl pr-3">
                <Input
                  placeholder="Consult with SmartAssistant..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-14 pl-6 text-sm font-bold placeholder:italic placeholder:font-medium placeholder:text-muted-foreground/40"
                />
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:flex rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 h-10 w-10"
                      >
                        <Cpu className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold">System Core</p>
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent className="bg-background/80 backdrop-blur-2xl border-2 border-primary/10 rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold tracking-tight">
              Delete Chat History?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              This action cannot be undone. Your conversation history will be
              permanently deleted from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-primary/10 font-bold uppercase text-[10px] tracking-widest hover:bg-primary/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && deleteSession(sessionToDelete)}
              className="rounded-xl bg-red-500 hover:bg-red-600 font-bold uppercase text-[10px] tracking-widest text-white border-none shadow-lg shadow-red-500/20"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function Bot(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
