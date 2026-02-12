import { useState, useEffect } from "react";
import { Search, ChevronDown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KalshiEvent } from "@/types/kalshi";

interface BetSearchProps {
  events: KalshiEvent[];
  isLoading: boolean;
  onSelectEvent: (event: KalshiEvent) => void;
}

export function BetSearch({ events, isLoading, onSelectEvent }: BetSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.category?.toLowerCase().includes(query.toLowerCase())
  );

  const displayEvents = query ? filtered : filtered.slice(0, 50);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Loading bets..." : "Search Kalshi bets..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-12 pr-12 h-14 text-base bg-card border-border focus:border-primary focus:ring-primary/20 rounded-xl font-mono"
          disabled={isLoading}
        />
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {isOpen && displayEvents.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-96 overflow-y-auto">
          {displayEvents.map((event) => (
            <button
              key={event.event_ticker}
              onClick={() => {
                onSelectEvent(event);
                setIsOpen(false);
                setQuery(event.title);
              }}
              className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border/50 last:border-0 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
                    {event.category}
                  </p>
                </div>
                <Zap className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-2 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filtered.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground text-sm">No bets found for "{query}"</p>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
