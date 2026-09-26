import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  Maximize2,
  Info,
} from 'lucide-react';
import { HourlyQuote, SentimentAnalysis, SENTIMENT_LEVELS, SentimentLevel } from '../types/sentiment';

interface NikkeiChartProps {
  history: HourlyQuote[];
  activeSentiment: SentimentAnalysis;
  onSelectHour: (quote: HourlyQuote) => void;
  selectedHourStr: string | null;
}

type ChartMode = 'area' | 'candle';
type TimeRange = '1d' | '3d' | '5d';

export const NikkeiChart: React.FC<NikkeiChartProps> = ({
  history,
  activeSentiment,
  onSelectHour,
  selectedHourStr,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('5d');
  const [hoveredQuote, setHoveredQuote] = useState<HourlyQuote | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter history based on range
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    if (timeRange === '1d') {
      return history.slice(-8); // Approx 1 trading day (7-8 trading hours)
    } else if (timeRange === '3d') {
      return history.slice(-21);
    }
    return history;
  }, [history, timeRange]);

  // Calculations for chart geometry
  const chartMetrics = useMemo(() => {
    if (filteredHistory.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    }
    const prices = filteredHistory.flatMap((q) => [q.low, q.high]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 100;
    return {
      minPrice: Math.floor(min - padding),
      maxPrice: Math.ceil(max + padding),
      priceRange: (max - min + padding * 2) || 1,
    };
  }, [filteredHistory]);

  const svgWidth = 900;
  const svgHeight = 360;
  const margin = { top: 25, right: 65, bottom: 40, left: 15 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const getX = (index: number) => {
    if (filteredHistory.length <= 1) return margin.left + innerWidth / 2;
    return margin.left + (index / (filteredHistory.length - 1)) * innerWidth;
  };

  const getY = (price: number) => {
    const { minPrice, priceRange } = chartMetrics;
    const normalized = (price - minPrice) / priceRange;
    return margin.top + innerHeight - normalized * innerHeight;
  };

  // Generate Area & Line SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (filteredHistory.length === 0) return { linePath: '', areaPath: '' };

    let lPath = '';
    filteredHistory.forEach((q, idx) => {
      const x = getX(idx);
      const y = getY(q.close);
      if (idx === 0) {
        lPath += `M ${x} ${y}`;
      } else {
        lPath += ` L ${x} ${y}`;
      }
    });

    const firstX = getX(0);
    const lastX = getX(filteredHistory.length - 1);
    const bottomY = margin.top + innerHeight;
    const aPath = `${lPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { linePath: lPath, areaPath: aPath };
  }, [filteredHistory, chartMetrics]);

  // Price grid steps
  const priceGridSteps = useMemo(() => {
    const { minPrice, maxPrice } = chartMetrics;
    const stepCount = 5;
    const stepSize = (maxPrice - minPrice) / stepCount;
    return Array.from({ length: stepCount + 1 }, (_, i) => minPrice + i * stepSize);
  }, [chartMetrics]);

  const currentDisplayQuote = hoveredQuote || (
    selectedHourStr
      ? filteredHistory.find((q) => q.dateHourStr === selectedHourStr) || filteredHistory[filteredHistory.length - 1]
      : filteredHistory[filteredHistory.length - 1]
  );

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md flex flex-col"
    >
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <span>日経平均 1時間足ヒストリカルチャート</span>
            </h2>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
              1h interval
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            各1時間ごとのローソク足／推移と、その時点の「お気持ち」をプロット
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                chartMode === 'area'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              エリア線
            </button>
            <button
              onClick={() => setChartMode('candle')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                chartMode === 'candle'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ローソク足
            </button>
          </div>

          {/* Range Selector */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs font-mono">
            {(['1d', '3d', '5d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  timeRange === r
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === '1d' ? '24時間' : r === '3d' ? '3日間' : '5日間'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Hover / Active Point Info Bar */}
      {currentDisplayQuote && (
        <div className="mb-4 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="font-mono text-indigo-300 font-bold text-sm">
              {currentDisplayQuote.dateHourStr} (JST)
            </div>
            <div className="text-slate-400">
              始: <span className="font-mono text-white">¥{currentDisplayQuote.open.toLocaleString()}</span>
            </div>
            <div className="text-slate-400">
              高: <span className="font-mono text-emerald-400">¥{currentDisplayQuote.high.toLocaleString()}</span>
            </div>
            <div className="text-slate-400">
              安: <span className="font-mono text-rose-400">¥{currentDisplayQuote.low.toLocaleString()}</span>
            </div>
            <div className="text-slate-400">
              終: <span className="font-mono font-bold text-white">¥{currentDisplayQuote.close.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <div
              className={`font-semibold ${
                currentDisplayQuote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              変動: {currentDisplayQuote.changePercent >= 0 ? '+' : ''}
              {currentDisplayQuote.changePercent.toFixed(2)}%
            </div>
            <span className="text-slate-600">|</span>
            {currentDisplayQuote.sentiment && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1 font-sans text-[11px]">
                <span>{currentDisplayQuote.emoji}</span>
                <span className="font-semibold">{currentDisplayQuote.sentiment}</span>
              </span>
            )}
            <span className="text-slate-600 hidden sm:inline">|</span>
            <div className="text-slate-400 font-sans hidden sm:flex items-center gap-1">
              <span>クリックで詳細AI診断</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[650px] overflow-visible"
        >
          <defs>
            {/* Area Chart Gradient */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="80%" stopColor="#6366f1" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-axis labels */}
          {priceGridSteps.map((price, idx) => {
            const y = getY(price);
            return (
              <g key={idx}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
                <text
                  x={margin.left + innerWidth + 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  ¥{Math.round(price).toLocaleString('ja-JP')}
                </text>
              </g>
            );
          })}

          {/* Area or Candlestick rendering */}
          {chartMode === 'area' && (
            <>
              {/* Filled Area */}
              <path d={areaPath} fill="url(#areaGradient)" />

              {/* Smooth Line */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {filteredHistory.map((q, idx) => {
                const x = getX(idx);
                const y = getY(q.close);
                const isSelected = q.dateHourStr === (selectedHourStr || activeSentiment.pointInTime);
                const isHovered = hoveredQuote?.dateHourStr === q.dateHourStr;

                return (
                  <g
                    key={q.timestamp}
                    className="cursor-pointer"
                    onClick={() => onSelectHour(q)}
                    onMouseEnter={() => setHoveredQuote(q)}
                    onMouseLeave={() => setHoveredQuote(null)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected || isHovered ? 6 : 3.5}
                      fill={isSelected ? '#ffffff' : '#6366f1'}
                      stroke={isSelected ? '#4f46e5' : '#1e1b4b'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-150 hover:scale-150"
                    />
                  </g>
                );
              })}
            </>
          )}

          {chartMode === 'candle' && (
            <g>
              {filteredHistory.map((q, idx) => {
                const x = getX(idx);
                const isBullish = q.close >= q.open;
                const candleColor = isBullish ? '#34d399' : '#f87171'; // Emerald vs Red
                const candleWidth = Math.max(3, Math.min(18, (innerWidth / filteredHistory.length) * 0.7));

                const yOpen = getY(q.open);
                const yClose = getY(q.close);
                const yHigh = getY(q.high);
                const yLow = getY(q.low);

                const topY = Math.min(yOpen, yClose);
                const height = Math.max(2, Math.abs(yClose - yOpen));
                const isSelected = q.dateHourStr === (selectedHourStr || activeSentiment.pointInTime);

                return (
                  <g
                    key={q.timestamp}
                    className="cursor-pointer group"
                    onClick={() => onSelectHour(q)}
                    onMouseEnter={() => setHoveredQuote(q)}
                    onMouseLeave={() => setHoveredQuote(null)}
                  >
                    {/* Wick (High to Low) */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={candleColor}
                      strokeWidth="1.5"
                    />

                    {/* Candle Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={topY}
                      width={candleWidth}
                      height={height}
                      fill={isBullish ? '#064e3b' : '#7f1d1d'}
                      stroke={candleColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      rx="1"
                    />

                    {isSelected && (
                      <circle
                        cx={x}
                        cy={yHigh - 10}
                        r="3.5"
                        fill="#6366f1"
                        className="animate-ping"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* X-axis time markers */}
          {filteredHistory.map((q, idx) => {
            // Show every Nth label to avoid overlap
            const step = filteredHistory.length > 20 ? 4 : filteredHistory.length > 10 ? 2 : 1;
            if (idx % step !== 0 && idx !== filteredHistory.length - 1) return null;

            const x = getX(idx);
            const y = margin.top + innerHeight + 18;

            return (
              <text
                key={idx}
                x={x}
                y={y}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {q.displayTime}
              </text>
            );
          })}

          {/* Active / Hovered Crosshair vertical line */}
          {currentDisplayQuote && (
            (() => {
              const activeIdx = filteredHistory.findIndex(
                (q) => q.dateHourStr === currentDisplayQuote.dateHourStr
              );
              if (activeIdx === -1) return null;
              const x = getX(activeIdx);
              const y = getY(currentDisplayQuote.close);

              return (
                <g pointerEvents="none">
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + innerHeight}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#ffffff"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                  />
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* Chart Footer Help */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            グラフ上のポイントをクリックすると、その1時間の詳細なお気持ち診断を切り替え表示できます。
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> 陽線・上昇
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> 陰線・下落
          </span>
        </div>
      </div>
    </div>
  );
};
