import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ResearchResult } from "@/types/kalshi";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  eventTitle: string;
  research: ResearchResult;
}

export function ResearchChat({ eventTitle, research }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-expand when first message is sent
  useEffect(() => {
    if (messages.length > 0) setExpanded(true);
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke("bet-research", {
        body: {
          chatMode: true,
          eventTitle,
          researchContext: JSON.stringify({
            categories: research.categories?.slice(0, 3) || [],
            probability: research.probability,
            candidates: research.candidates,
          }),
          chatHistory: newMessages,
          question: text,
        },
      });

      if (error) {
        console.error("Chat invoke error:", error);
        throw error;
      }
      
      const answer = data?.answer || (typeof data === 'string' ? data : null);
      if (!answer) {
        console.error("Unexpected chat response:", data);
        throw new Error("No answer received");
      }
      setMessages([...newMessages, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't answer that. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const handleDismiss = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 80) handleDismiss(); // swipe right to dismiss
    touchStartX.current = null;
  }, [handleDismiss]);

  return (
    <>
      {/* Expanded message overlay - covers ~1/3 of screen */}
      {expanded && messages.length > 0 && (
        <div
          className="fixed bottom-12 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border"
          style={{ height: "33vh" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="max-w-lg mx-auto h-full flex flex-col">
            {/* Header with close */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <p className="text-xs text-muted-foreground font-medium">Chat</p>
              <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="bg-muted rounded-2xl px-3 py-2 w-fit">
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>
        </div>
      )}

      {/* Sticky input - always visible at bottom above nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-2 safe-bottom">
        <div className="relative max-w-lg mx-auto">
          <Input
            placeholder="Ask about this research..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            onFocus={() => messages.length > 0 && setExpanded(true)}
            className="pr-10 h-10 text-sm bg-card border border-border rounded-xl"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary disabled:text-muted-foreground"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
