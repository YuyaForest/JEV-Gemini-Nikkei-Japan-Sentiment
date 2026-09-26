import React from 'react';
import { Sparkles, MessageCircle, AlertCircle, Award, Compass, ArrowUpRight } from 'lucide-react';
import { SentimentAnalysis, SENTIMENT_LEVELS, SentimentLevel } from '../types/sentiment';

interface SentimentHeroProps {
  sentiment: SentimentAnalysis;
  onSelectLevel?: (level: SentimentLevel) => void;
}

export const SentimentHero: React.FC<SentimentHeroProps> = ({ sentiment }) => {
  const meta = SENTIMENT_LEVELS[sentiment.sentiment] || SENTIMENT_LEVELS['ちょっと強気'];

  // Normalize score (-100 to 100) to percentage (0% to 100%)
  const meterPercentage = Math.min(100, Math.max(0, ((sentiment.sentimentScore + 100) / 200) * 100));

  const allLevels: SentimentLevel[] = [
    'とても弱気',
    '弱気',
    'ちょっと弱気',
    'ちょっと強気',
    '強気',
    'とても強気',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
      {/* Background ambient glow matching sentiment */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: meta.color }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: meta.color }}
      />

      {/* Main Tagline Banner (Prominent User Requirement) */}
      <div className="relative z-10 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-indigo-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>最新の日本のお気持ち速報</span>
          </div>

          {/* Jev System One Hierarchical Badges */}
          {sentiment.macroDirection && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium">
                大分類: <strong className="text-white">{sentiment.macroDirection}</strong>
              </span>
              {typeof sentiment.confidence === 'number' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                  Jev 信頼度: <strong className="text-emerald-400">{Math.round(sentiment.confidence * 100)}%</strong>
                </span>
              )}
              {typeof sentiment.isPanicSellingProb === 'number' && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                  狼狽売りリスク: <strong className="text-red-400">{Math.round(sentiment.isPanicSellingProb * 100)}%</strong>
                </span>
              )}
              {typeof sentiment.isOverheatedBubbleProb === 'number' && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  過熱バブル感: <strong className="text-purple-400">{Math.round(sentiment.isOverheatedBubbleProb * 100)}%</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* The required attractive tagline */}
        <div className="p-4 md:p-6 rounded-xl bg-slate-950/60 border border-slate-800 shadow-inner">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-1">
            JAPAN MARKET SENTIMENT TAGLINE
          </p>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-relaxed flex flex-wrap items-center gap-2">
            <span>
              「<span className="font-mono text-indigo-300">{sentiment.pointInTime}</span>時点での日本のお気持ちは
            </span>
            <span
              className="px-3 py-1 rounded-lg border shadow-md inline-flex items-center gap-2 my-1"
              style={{
                backgroundColor: `${meta.color}18`,
                borderColor: `${meta.color}50`,
                color: meta.color,
              }}
            >
              "{sentiment.sentiment}"
            </span>
            <span>です。</span>
            <span className="text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md select-none inline-block animate-bounce">
              {sentiment.emoji}
            </span>
            <span>」</span>
          </div>
        </div>
      </div>

      {/* 6-Stage Sentiment Visual Meter */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span className="flex items-center gap-1 text-red-400">
            <span>😱📉 極度の弱気</span>
          </span>
          <span className="text-slate-300 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            お気持ち指数: {sentiment.sentimentScore > 0 ? `+${sentiment.sentimentScore}` : sentiment.sentimentScore} / 100
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <span>極度の強気 🤩🔥</span>
          </span>
        </div>

        {/* 6 Segment Progress Bar */}
        <div className="relative">
          <div className="grid grid-cols-6 gap-1.5 h-3 rounded-full overflow-hidden bg-slate-950/80 p-0.5 border border-slate-800">
            {allLevels.map((lvl) => {
              const itemMeta = SENTIMENT_LEVELS[lvl];
              const isActive = sentiment.sentiment === lvl;
              return (
                <div
                  key={lvl}
                  className={`h-full rounded-sm transition-all duration-300 ${
                    isActive ? 'ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-70'
                  }`}
                  style={{ backgroundColor: itemMeta.color }}
                  title={`${lvl}: ${itemMeta.description}`}
                />
              );
            })}
          </div>

          {/* Pointer indicator */}
          <div
            className="absolute -top-1 transition-all duration-700 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${meterPercentage}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-md ring-2 ring-indigo-500 animate-pulse" />
          </div>
        </div>

        {/* 6 Stages Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4">
          {allLevels.map((lvl) => {
            const itemMeta = SENTIMENT_LEVELS[lvl];
            const isActive = sentiment.sentiment === lvl;
            const prob = sentiment.probabilities ? sentiment.probabilities[lvl] : undefined;

            return (
              <div
                key={lvl}
                className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-800/90 shadow-lg scale-105 ring-1 ring-white/20'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-70 hover:opacity-90'
                }`}
                style={{
                  borderColor: isActive ? itemMeta.color : undefined,
                  boxShadow: isActive ? `0 0 15px ${itemMeta.color}30` : undefined,
                }}
              >
                <div className="text-xl sm:text-2xl mb-1">{itemMeta.emoji}</div>
                <div
                  className="text-xs font-bold"
                  style={{ color: isActive ? itemMeta.color : '#94a3b8' }}
                >
                  {lvl}
                </div>
                {prob !== undefined && (
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    確率: <strong className={isActive ? 'text-white' : 'text-slate-400'}>{Math.round(prob * 100)}%</strong>
                  </div>
                )}
                {isActive && (
                  <span className="mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white font-medium">
                    現在判定
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Psychology Reasoning, Key Signals, & Humorous Commentary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market Psychological Diagnosis */}
        <div className="lg:col-span-2 bg-slate-950/40 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>市場心理・値動き分析</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">{sentiment.headline}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {sentiment.psychologyReason}
            </p>
          </div>

          {/* Key Signals */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>判定の根拠シグナル</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sentiment.keySignals.map((signal, idx) => (
                <div
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Humorous Japan Sentiment Take */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900/60 rounded-xl p-5 border border-indigo-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 mb-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <span>兜町・お茶の間のお気持ち</span>
            </div>
            <p className="text-sm text-purple-100 font-medium italic leading-relaxed">
              "{sentiment.humorousTake}"
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-900/30 flex items-center justify-between text-xs text-purple-300/80">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              TypeSafe AI 診断済
            </span>
            <span className="font-mono text-[11px]">{sentiment.pointInTime} JST</span>
          </div>
        </div>
      </div>
    </div>
  );
};
