export type SentimentLevel =
  | 'とても弱気'
  | '弱気'
  | 'ちょっと弱気'
  | 'ちょっと強気'
  | '強気'
  | 'とても強気';

export interface SentimentMeta {
  level: SentimentLevel;
  emoji: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  scoreRange: [number, number];
}

export const SENTIMENT_LEVELS: Record<SentimentLevel, SentimentMeta> = {
  'とても弱気': {
    level: 'とても弱気',
    emoji: '😱📉',
    color: '#ef4444',
    badgeBg: 'bg-red-500/10',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-400',
    description: '総悲観・投げ売り警戒ムード。息が止まるような緊張感。',
    scoreRange: [-100, -60],
  },
  '弱気': {
    level: '弱気',
    emoji: '😰🌧️',
    color: '#f97316',
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400',
    description: '下落懸念が優勢。買い手が引っ込み手探り状態。',
    scoreRange: [-60, -20],
  },
  'ちょっと弱気': {
    level: 'ちょっと弱気',
    emoji: '🫤⛅',
    color: '#eab308',
    badgeBg: 'bg-yellow-500/10',
    badgeBorder: 'border-yellow-500/30',
    badgeText: 'text-yellow-400',
    description: '上値の重さを嫌気し、様子見と利確が交錯。',
    scoreRange: [-20, 0],
  },
  'ちょっと強気': {
    level: 'ちょっと強気',
    emoji: '🙂🌤️',
    color: '#3b82f6',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    description: '押し目買い意欲が台頭。底堅さに安堵感が漂う。',
    scoreRange: [0, 20],
  },
  '強気': {
    level: '強気',
    emoji: '😊🚀',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    description: '買い先行で勢いあり。市場全体に前向きな活気。',
    scoreRange: [20, 60],
  },
  'とても強気': {
    level: 'とても強気',
    emoji: '🤩🔥',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    description: '熱狂・イケイケ相場！青天井期待と過熱感の共存。',
    scoreRange: [60, 100],
  },
};

export interface HourlyQuote {
  timestamp: number; // UNIX epoch ms
  isoTime: string;
  dateHourStr: string; // e.g. "2026-09-25-15"
  displayTime: string; // e.g. "09/25 15:00"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  sentiment: SentimentLevel;
  emoji: string;
}

export interface SentimentAnalysis {
  sentiment: SentimentLevel;
  emoji: string;
  tagline: string; // e.g. "2026-09-25-15時点での日本のお気持ちは\"ちょっと弱気\"です。🫤⛅"
  sentimentScore: number; // -100 (極度の弱気) ~ +100 (極度の強気)
  headline: string;
  psychologyReason: string;
  keySignals: string[];
  humorousTake: string;
  pointInTime: string; // "YYYY-MM-DD-HH"
  analyzedPrice: number;
  analyzedChangePercent: number;
  // Jev System One Hierarchical Decision Primitives
  macroDirection?: string; // 大分類: 弱気バイアス / 中立・拮抗 / 強気バイアス
  confidence?: number; // 判定の確信度 (0.0〜1.0)
  probabilities?: Record<string, number>; // 6段階の確率分布
  isPanicSellingProb?: number; // 狼狽売り・底割れ確率 (0.0〜1.0)
  isOverheatedBubbleProb?: number; // 買われすぎ・過熱バブル確率 (0.0〜1.0)
  engineUsed?: 'jev_systemone' | 'gemini_flash' | 'fallback_rule';
  historicalSentimentTimeline?: Array<{
    dateHourStr: string;
    close: number;
    sentiment: SentimentLevel;
    emoji: string;
  }>;
}

export interface MarketResponse {
  symbol: string;
  name: string;
  currency: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  lastUpdated: string;
  latestHourStr: string;
  history: HourlyQuote[];
  sentiment: SentimentAnalysis;
}
