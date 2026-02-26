export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  sub_title?: string;
  mutually_exclusive: boolean;
  strike_date?: string;
  markets?: KalshiMarket[];
  total_volume?: number;
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  volume?: number;
  open_interest?: number;
  status: string;
  close_time?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
}

export interface ResearchCategory {
  title: string;
  icon: string;
  confidence: "high" | "medium" | "low";
  bullets: string[];
}

export interface ProbabilityFactor {
  name: string;
  suggestedProbability: number;
  weight: number;
}

export interface ProbabilityEstimate {
  estimate: number;
  factors: ProbabilityFactor[];
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

export interface Candidate {
  name: string;
  probability: number;
}

export interface Threshold {
  level: string;
  probability: number;
}

export interface ResearchResult {
  categories: ResearchCategory[];
  probability: ProbabilityEstimate;
  candidates?: Candidate[];
  thresholds?: Threshold[];
  imageUrl?: string | null;
  cacheMeta?: { hit?: boolean; steps?: string[] };
}
