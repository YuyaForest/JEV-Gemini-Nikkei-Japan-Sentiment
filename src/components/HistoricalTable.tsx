import React, { useState } from 'react';
import { Table, Calendar, ArrowUpDown, ChevronRight, Eye } from 'lucide-react';
import { HourlyQuote, SentimentAnalysis, SENTIMENT_LEVELS, SentimentLevel } from '../types/sentiment';

interface HistoricalTableProps {
  history: HourlyQuote[];
  activeSentiment: SentimentAnalysis;
  onSelectHour: (quote: HourlyQuote) => void;
  selectedHourStr: string | null;
}

export const HistoricalTable: React.FC<HistoricalTableProps> = ({
  history,
  activeSentiment,
  onSelectHour,
  selectedHourStr,
}) => {
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');

  const sortedQuotes = React.useMemo(() => {
    const list = [...history];
    list.sort((a, b) => (sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));

    if (filterSentiment === 'all') return list;

    return list.filter((q) => {
      const currentSentiment =
        q.dateHourStr === selectedHourStr ? activeSentiment.sentiment : q.sentiment;
      return currentSentiment === filterSentiment;
    });
  }, [history, sortAsc, filterSentiment, selectedHourStr, activeSentiment]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            <span>1時間ごとヒストリカル履歴とお気持ち一覧</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            日経平均の各時間帯における株価変動・売買代金と6段階センチメント判定履歴
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sentiment Filter */}
          <select
            value={filterSentiment}
            onChange={(e) => setFilterSentiment(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">すべてのお気持ち</option>
            <option value="とても弱気">😱📉 とても弱気</option>
            <option value="弱気">😰🌧️ 弱気</option>
            <option value="ちょっと弱気">🫤⛅ ちょっと弱気</option>
            <option value="ちょっと強気">🙂🌤️ ちょっと強気</option>
            <option value="強気">😊🚀 強気</option>
            <option value="とても強気">🤩🔥 とても強気</option>
          </select>

          {/* Sort Button */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 font-medium transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortAsc ? '古い順' : '新しい順'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <th className="pb-3 pl-2">日時 (JST)</th>
              <th className="pb-3">お気持ち判定</th>
              <th className="pb-3 text-right">始値</th>
              <th className="pb-3 text-right">高値</th>
              <th className="pb-3 text-right">安値</th>
              <th className="pb-3 text-right">終値</th>
              <th className="pb-3 text-right">変動率</th>
              <th className="pb-3 pr-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sortedQuotes.map((q) => {
              const isSelected = q.dateHourStr === (selectedHourStr || activeSentiment.pointInTime);
              const sentimentLevel: SentimentLevel = isSelected
                ? activeSentiment.sentiment
                : (q.sentiment || 'ちょっと強気');
              const sentimentEmoji = isSelected ? activeSentiment.emoji : (q.emoji || '🙂🌤️');
              const meta = SENTIMENT_LEVELS[sentimentLevel] || SENTIMENT_LEVELS['ちょっと強気'];
              const isPositive = q.changePercent >= 0;

              return (
                <tr
                  key={q.timestamp}
                  onClick={() => onSelectHour(q)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-950/40 text-white font-medium'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{q.dateHourStr}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500 text-white font-sans">
                          選択中
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-sans"
                      style={{
                        backgroundColor: `${meta.color}15`,
                        borderColor: `${meta.color}40`,
                        color: meta.color,
                      }}
                    >
                      <span>{sentimentEmoji}</span>
                      <span>{sentimentLevel}</span>
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-400">¥{q.open.toLocaleString()}</td>
                  <td className="py-3 text-right text-emerald-400">¥{q.high.toLocaleString()}</td>
                  <td className="py-3 text-right text-rose-400">¥{q.low.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-white">¥{q.close.toLocaleString()}</td>
                  <td
                    className={`py-3 text-right font-bold ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {q.changePercent.toFixed(2)}%
                  </td>
                  <td className="py-3 pr-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHour(q);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition-colors"
                      title="この時間の詳細お気持ちを表示"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
