/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SentimentHero } from './components/SentimentHero';
import { NikkeiChart } from './components/NikkeiChart';
import { HistoricalTable } from './components/HistoricalTable';
import { TypeSafeAISchemaModal } from './components/TypeSafeAISchemaModal';
import { MarketResponse, HourlyQuote, SentimentAnalysis } from './types/sentiment';
import { AlertCircle, RefreshCw, Sparkles, ArrowLeft, Activity } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzingPoint, setAnalyzingPoint] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSentiment, setActiveSentiment] = useState<SentimentAnalysis | null>(null);
  const [selectedHourStr, setSelectedHourStr] = useState<string | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);

  // Fetch live market data & latest sentiment
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market-sentiment');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      const json: MarketResponse = await res.json();
      setData(json);
      setActiveSentiment(json.sentiment);
      setSelectedHourStr(json.latestHourStr);
    } catch (err: any) {
      console.error('Failed to load market sentiment data:', err);
      setError(err.message || 'データ取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Handle clicking a specific point on the chart or table
  const handleSelectHour = async (quote: HourlyQuote) => {
    if (!data) return;

    // If it's already the latest hour
    if (quote.dateHourStr === data.latestHourStr) {
      setActiveSentiment(data.sentiment);
      setSelectedHourStr(data.latestHourStr);
      return;
    }

    setSelectedHourStr(quote.dateHourStr);
    setAnalyzingPoint(true);

    try {
      const res = await fetch('/api/analyze-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateHourStr: quote.dateHourStr }),
      });

      if (!res.ok) {
        throw new Error('個別時点の分析リクエストに失敗しました');
      }

      const resJson = await res.json();
      if (resJson.sentiment) {
        setActiveSentiment(resJson.sentiment);
      }
    } catch (err) {
      console.error('Point analysis failed:', err);
    } finally {
      setAnalyzingPoint(false);
    }
  };

  const handleResetToLatest = () => {
    if (data) {
      setActiveSentiment(data.sentiment);
      setSelectedHourStr(data.latestHourStr);
    }
  };

  const isInspectingPastHour = data && selectedHourStr && selectedHourStr !== data.latestHourStr;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        data={data}
        loading={loading}
        onRefresh={fetchMarketData}
        onOpenSchema={() => setIsSchemaModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="rounded-xl bg-red-950/60 border border-red-800/80 p-4 text-sm text-red-200 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchMarketData}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              再試行
            </button>
          </div>
        )}

        {/* Loading state indicator */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Activity className="w-7 h-7 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              yfinance より日経平均 1時間足を同期中...
            </p>
            <p className="text-xs text-slate-500">
              Gemini 3.8 Flash TypeSafe AI によるお気持ち判定を実行しています
            </p>
          </div>
        )}

        {/* Loaded Content */}
        {data && activeSentiment && (
          <>
            {/* Historical inspection banner if past hour selected */}
            {isInspectingPastHour && (
              <div className="bg-indigo-950/70 border border-indigo-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-md animate-in fade-in">
                <div className="flex items-center gap-2 text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>
                    過去時点 <strong className="text-white font-mono">{selectedHourStr}</strong> の日本のお気持ちを個別プレビュー中
                  </span>
                </div>
                <button
                  onClick={handleResetToLatest}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>最新のお気持ちに戻る</span>
                </button>
              </div>
            )}

            {/* Hero Section: Prominent Tagline & 6-Stage Sentiment Meter */}
            <div className="relative">
              {analyzingPoint && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-20 rounded-2xl flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-xs text-indigo-300 shadow-xl">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>指定時点のお気持ちをTypeSafe AIで解析中...</span>
                  </div>
                </div>
              )}
              <SentimentHero sentiment={activeSentiment} />
            </div>

            {/* 1-Hour Historical Nikkei Chart */}
            <NikkeiChart
              history={data.history}
              activeSentiment={activeSentiment}
              onSelectHour={handleSelectHour}
              selectedHourStr={selectedHourStr}
            />

            {/* Historical 1-Hour Data & Sentiment Table */}
            <HistoricalTable
              history={data.history}
              activeSentiment={activeSentiment}
              onSelectHour={handleSelectHour}
              selectedHourStr={selectedHourStr}
            />
          </>
        )}
      </main>

      {/* TypeSafe AI JSON Schema Modal */}
      <TypeSafeAISchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        sentiment={activeSentiment}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            日経平均(^N225) データソース: Yahoo Finance / yfinance 1時間足
          </p>
          <p className="font-mono text-[11px] text-slate-600">
            Powered by Gemini 3.8 Flash • TypeSafe AI JEV Validation
          </p>
        </div>
      </footer>
    </div>
  );
}
