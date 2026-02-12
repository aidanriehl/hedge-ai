import { useState } from "react";
import { Search } from "lucide-react";
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

  const displayEvents = query ? filtered.slice(0, 20) : [];

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Loading..." : "Search markets"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-11 text-[15px] bg-secondary border-0 rounded-xl placeholder:text-muted-foreground"
          disabled={isLoading}
        />
      </div>

      {isOpen && displayEvents.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {displayEvents.map((event) => (
            <button
              key={event.event_ticker}
              onClick={() => {
                onSelectEvent(event);
                setIsOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border/50 last:border-0"
            >
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{event.category}</p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filtered.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-muted-foreground text-sm">No results for "{query}"</p>
        </div>
      )}

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
