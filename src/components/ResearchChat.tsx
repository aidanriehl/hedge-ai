import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("bet-research", {
        body: {
          chatMode: true,
          eventTitle,
          researchContext: JSON.stringify(research),
          chatHistory: newMessages,
          question: text,
        },
      });

      if (error) throw error;
      setMessages([...newMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't answer that. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="bg-card border border-border rounded-2xl px-4 py-2.5 w-fit">
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-16 z-40 bg-background/80 backdrop-blur-xl pt-2 pb-3">
        <div className="relative max-w-lg mx-auto">
          <Input
            placeholder="Ask about this research..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="pr-10 h-11 text-sm bg-card border border-border rounded-xl"
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
    </div>
  );
}
