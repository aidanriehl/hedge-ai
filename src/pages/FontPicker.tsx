import { useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FONTS = [
  { name: "Space Grotesk", import: "Space+Grotesk:wght@500;600;700", style: "'Space Grotesk', sans-serif", vibe: "Geometric · Techy" },
  { name: "Outfit", import: "Outfit:wght@500;600;700", style: "'Outfit', sans-serif", vibe: "Clean · Modern" },
  { name: "Sora", import: "Sora:wght@500;600;700", style: "'Sora', sans-serif", vibe: "Futuristic · Sharp" },
  { name: "DM Sans", import: "DM+Sans:wght@500;600;700", style: "'DM Sans', sans-serif", vibe: "Soft · Friendly" },
  { name: "Plus Jakarta Sans", import: "Plus+Jakarta+Sans:wght@500;600;700", style: "'Plus Jakarta Sans', sans-serif", vibe: "Premium · Rounded" },
  { name: "Instrument Sans", import: "Instrument+Sans:wght@500;600;700", style: "'Instrument Sans', sans-serif", vibe: "Editorial · Refined" },
  { name: "Bricolage Grotesque", import: "Bricolage+Grotesque:wght@500;600;700", style: "'Bricolage Grotesque', sans-serif", vibe: "Bold · Playful" },
  { name: "Manrope", import: "Manrope:wght@500;600;700", style: "'Manrope', sans-serif", vibe: "Minimal · Elegant" },
  { name: "Cabinet Grotesk", import: "Cabinet+Grotesk:wght@500;600;700", style: "'Cabinet Grotesk', sans-serif", vibe: "Strong · Distinctive", fallback: true },
  { name: "Clash Display", import: "Clash+Display:wght@500;600;700", style: "'Clash Display', sans-serif", vibe: "Statement · Bold", fallback: true },
];

// Load all fonts
const fontImportUrl = `https://fonts.googleapis.com/css2?${FONTS.filter(f => !f.fallback).map(f => `family=${f.import}`).join("&")}&display=swap`;

export default function FontPicker() {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <>
      <link rel="stylesheet" href={fontImportUrl} />
      {/* Fontshare fonts */}
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700&f[]=clash-display@500,600,700&display=swap" />

      <div className="min-h-screen bg-background safe-top safe-bottom">
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-primary font-medium">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Back</span>
            </button>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
          <div className="text-center pb-2">
            <h1 className="text-2xl font-bold text-foreground">Pick a Display Font</h1>
            <p className="text-sm text-muted-foreground mt-1">Used for the logo, titles & headings</p>
          </div>

          <div className="space-y-3">
            {FONTS.map((font) => {
              const isSelected = selected === font.name;
              return (
                <button
                  key={font.name}
                  onClick={() => setSelected(font.name)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{font.vibe}</span>
                      </div>
                      <p
                        style={{ fontFamily: font.style }}
                        className="text-2xl font-bold text-foreground leading-tight"
                      >
                        Hedge AI
                      </p>
                      <p
                        style={{ fontFamily: font.style }}
                        className="text-lg font-semibold text-foreground/80 mt-1"
                      >
                        Research Your Bet
                      </p>
                      <p
                        style={{ fontFamily: font.style }}
                        className="text-sm font-medium text-muted-foreground mt-1"
                      >
                        Yes — 73% · Hottest Bets Right Now
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-2">{font.name}</p>
                    </div>
                    {isSelected && (
                      <div className="bg-primary rounded-full p-1 flex-shrink-0 mt-1">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
              <div className="max-w-lg mx-auto">
                <button
                  onClick={() => {
                    // Store choice and go back
                    localStorage.setItem("betscope_font_choice", selected);
                    navigate("/");
                  }}
                  className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl text-[15px] shadow-lg"
                >
                  Use {selected}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
