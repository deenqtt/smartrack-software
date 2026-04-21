"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  User,
  Cpu,
  Zap,
  Sparkles,
  Activity,
  ShieldCheck,
  Database,
  Info,
  X,
  MessageSquare,
  Plus,
  Minimize2,
  Maximize2,
  Clock,
  ChevronLeft,
  Trash2,
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
import { usePathname } from "next/navigation";

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
export function AIChatPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ right: 24, bottom: 24 });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    startX: 0, startY: 0,
    startBottom: 0, startRight: 0,
    isDragging: false,
    dragged: false
  });
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [mounted, setMounted] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAIPath = pathname === "/ai-insights";

  const initialMessage = (): Message => ({
    role: "assistant",
    content:
      "Halo! Saya **Smartrack Assistant**, asisten cerdas Anda. Saya ahli dalam memantau sistem IOT ini, tapi kita juga bisa mengobrol tentang apa saja—mulai dari teknologi, tips harian, hingga sekadar teman diskusi. Ada yang bisa saya bantu hari ini?",
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

    // Load saved position
    const savedPos = localStorage.getItem("smartrack_ai_chat_pos");
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Sync with localStorage
  useEffect(() => {
    if (mounted && sessions.length > 0) {
      localStorage.setItem("smartrack_ai_sessions", JSON.stringify(sessions));
    }
  }, [sessions, mounted]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "smartrack_ai_sessions" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const restored = parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }));
          setSessions(restored);
        } catch (e) {
          console.error("Sync error", e);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSessionId, sessions, loading, isOpen]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const handleSend = async () => {
    if (!input.trim() || loading || !activeSessionId) return;

    const userMessage = input.trim();
    setInput("");

    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        const newMessages: Message[] = [
          ...s.messages,
          {
            role: "user",
            content: userMessage,
            timestamp: new Date(),
          },
        ];
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
    });

    setSessions(updatedSessions);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
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
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      const newS = createNewSession();
      setSessions([newS]);
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
      description: "Ready to paste.",
      duration: 2000,
    });
  };

  const renderContent = (content: string, role: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const langMatch = lines[0].match(/```(\w+)?/);
        const lang = langMatch?.[1] || "code";
        const code = lines.slice(1, -1).join("\n");

        return (
          <div key={i} className="my-2 relative group/code shrink w-full min-w-0">
            <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-background/80 backdrop-blur-md border border-primary/20 hover:bg-primary/10 text-primary shadow-lg"
                onClick={() => copyToClipboard(code)}
              >
                <Copy className="w-2.5 h-2.5" />
              </Button>
            </div>
            <div className="px-3 py-1 bg-primary/5 border-b border-primary/10 flex items-center justify-between rounded-t-xl">
              <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">
                {lang}
              </span>
            </div>
            <pre className="bg-black/20 p-3 overflow-x-auto rounded-b-xl border border-t-0 border-primary/10 text-[10px] font-mono leading-relaxed custom-scrollbar text-foreground/80">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={i} className="whitespace-pre-wrap break-words min-w-0">
          {part.split("**").map((subPart, subIdx) =>
            subIdx % 2 === 1 ? (
              <strong
                key={subIdx}
                className={`font-black uppercase tracking-wider text-[9px] px-1 py-0.5 rounded ${role === "user" ? "bg-black/10" : "bg-primary/10 text-primary"}`}
              >
                {subPart}
              </strong>
            ) : (
              subPart
            ),
          )}
        </div>
      );
    });
  };

  if (!mounted || isAIPath) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag by the toggle button or header, but ignore if clicking a sub-button
    if ((e.target as HTMLElement).closest("button")) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBottom: position.bottom,
      startRight: position.right,
      isDragging: true,
      dragged: false
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;

    const dx = dragRef.current.startX - e.clientX;
    const dy = dragRef.current.startY - e.clientY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!dragRef.current.dragged) {
        dragRef.current.dragged = true;
        setIsDragging(true);
      }
    }

    if (dragRef.current.dragged) {
      // Create constraints so it doesn't go off-screen entirely
      const maxRight = window.innerWidth - 60;
      const maxBottom = window.innerHeight - 60;

      const newRight = Math.min(maxRight, Math.max(0, dragRef.current.startRight + dx));
      const newBottom = Math.min(maxBottom, Math.max(0, dragRef.current.startBottom + dy));

      setPosition({ right: newRight, bottom: newBottom });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (dragRef.current.dragged) {
        localStorage.setItem("smartrack_ai_chat_pos", JSON.stringify(position));
      }
    }
  };

  const handleToggleClick = () => {
    if (!dragRef.current.dragged) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <TooltipProvider>
      <div
        className={`fixed z-[100] ${isDragging ? '' : 'transition-opacity duration-500'} ${isOpen ? "opacity-100" : "opacity-100"}`}
        style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
      >
        {/* Chat Window */}
        {isOpen && (
          <Card className={`absolute bottom-20 ${position.right > window.innerWidth / 2 ? 'left-0' : 'right-0'} w-[380px] sm:w-[420px] h-[550px] border-2 border-primary/20 bg-background/80 backdrop-blur-2xl shadow-2xl rounded-[2rem] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300`}>
            {/* Header */}
            <div
              className="p-4 border-b border-primary/10 bg-primary/5 flex items-center justify-between scale-in-center cursor-move"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="flex items-center gap-3">
                {view === "history" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView("chat")}
                    className="h-8 w-8 hover:bg-primary/10 text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground uppercase leading-none">
                    {view === "history" ? "History" : "Smartrack Assistant"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                      {view === "history"
                        ? `${sessions.length} SESSIONS`
                        : "LIVE ANALYTICS"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {view === "chat" ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setView("history")}
                      className="w-8 h-8 rounded-lg hover:bg-primary/10 text-muted-foreground"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={createNewSession}
                      className="w-8 h-8 rounded-lg hover:bg-primary/10 text-muted-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      createNewSession();
                      setView("chat");
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-primary/10 text-primary"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {view === "history" ? (
              /* History List View */
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar animate-in fade-in slide-in-from-left-2 duration-300">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSessionId(s.id);
                      setView("chat");
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all cursor-pointer group relative ${activeSessionId === s.id
                      ? "bg-primary/10 border border-primary/20 text-primary shadow-sm"
                      : "hover:bg-primary/5 border border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${activeSessionId === s.id ? "text-primary" : "opacity-40"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate leading-none mb-1">
                        {s.title}
                      </p>
                      <p className="text-[8px] font-black uppercase opacity-40 tracking-wider">
                        {s.createdAt.toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500/50 hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              /* Standard Chat View */
              <>
                {/* Messages Area */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-grid-white/[0.01]"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-1`}
                    >
                      <div
                        className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${m.role === "user"
                            ? "bg-primary text-white border-white/10"
                            : "bg-muted/80 border-primary/10 text-primary"
                            }`}
                        >
                          {m.role === "user" ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <BotIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-[1.5] shadow-sm border relative group/message min-w-0 break-words ${m.role === "user"
                            ? "bg-primary text-primary-foreground border-white/10 rounded-tr-none"
                            : "bg-card/80 text-foreground border-primary/5 rounded-tl-none"
                            }`}
                        >
                          {/* Copy Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(m.content)}
                            className={`absolute -top-3 ${m.role === "user" ? "-left-3" : "-right-3"} opacity-0 group-hover/message:opacity-100 transition-all h-6 w-6 bg-background/90 backdrop-blur-xl border border-primary/20 rounded-xl text-primary shadow-xl scale-75 group-hover/message:scale-100`}
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </Button>

                          <div className="space-y-3 min-w-0 break-words">
                            {renderContent(m.content, m.role)}
                          </div>
                          <div
                            className={`mt-1 text-[8px] opacity-40 font-bold ${m.role === "user" ? "text-right" : "text-left"}`}
                          >
                            {m.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-muted/80 border border-primary/5 flex items-center justify-center animate-pulse">
                        <BotIcon className="w-4 h-4 text-primary/30" />
                      </div>
                      <div className="px-4 py-2.5 bg-muted/30 border border-primary/5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-primary/10 bg-background/60">
                  <div className="relative group">
                    <Input
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      className="h-12 rounded-xl pl-4 pr-12 bg-card/80 border-primary/10 focus-visible:ring-primary shadow-sm text-xs font-bold"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-700 shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Floating Action Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={handleToggleClick}
              className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center cursor-move touch-none active:scale-95 group relative z-50 ${isDragging ? "scale-105 opacity-80" : "transition-transform"} ${isOpen
                ? "bg-red-500 text-white hover:bg-red-600 rotate-90"
                : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-4 border-primary/20 hover:scale-105"
                }`}
            >
              {isOpen ? (
                <X className="w-6 h-6 relative z-10" />
              ) : (
                <BotIcon className="w-8 h-8 relative z-10" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="font-bold text-[10px] tracking-widest uppercase"
          >
            {isOpen ? "Close AI Terminal" : "Summon Smartrack Assistant"}
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent className="bg-background/80 backdrop-blur-2xl border-2 border-primary/10 rounded-[2rem] z-[101]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold tracking-tight">
              Delete Chat History?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              This action cannot be undone. Your conversation history will be
              permanently deleted.
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
