import React from 'react';
import { RefreshCw, Code, TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react';
import { MarketResponse } from '../types/sentiment';

interface HeaderProps {
  data: MarketResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenSchema: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, loading, onRefresh, onOpenSchema }) => {
  const isPositive = (data?.priceChange ?? 0) >= 0;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Ticker */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl">🗾</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                日本のお気持ちレーダー
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                TypeSafe Jev + Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>日経平均(^N225) 1時間足ヒストリカル × 感情クラス分類</span>
            </p>
          </div>
        </div>

        {/* Live Nikkei Stats */}
        {data && (
          <div className="flex flex-wrap items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2">
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                日経平均 最新値
              </div>
              <div className="text-base font-bold text-white font-mono flex items-center gap-1.5">
                ¥{data.currentPrice.toLocaleString('ja-JP')}
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-700 hidden sm:block" />

            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                直近1時間変動
              </div>
              <div
                className={`text-sm font-bold font-mono flex items-center gap-1 ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>
                  {isPositive ? '+' : ''}
                  {data.priceChange.toFixed(1)}円 ({isPositive ? '+' : ''}
                  {data.priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-700 hidden sm:block" />

            <div className="hidden lg:block">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                分析対象時点 (JST)
              </div>
              <div className="text-xs font-mono text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {data.latestHourStr}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={onOpenSchema}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="TypeSafe AI スキーマ定義と出力仕様"
          >
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">TypeSafe JEV</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '判定中...' : '更新'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
