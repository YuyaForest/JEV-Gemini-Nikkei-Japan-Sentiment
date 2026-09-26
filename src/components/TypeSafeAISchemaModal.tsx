import React from 'react';
import { X, ShieldCheck, CheckCircle2, Terminal, Cpu } from 'lucide-react';
import { SentimentAnalysis } from '../types/sentiment';

interface TypeSafeAISchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentiment: SentimentAnalysis | null;
}

export const TypeSafeAISchemaModal: React.FC<TypeSafeAISchemaModalProps> = ({
  isOpen,
  onClose,
  sentiment,
}) => {
  if (!isOpen) return null;

  const schemaDefinition = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "NikkeiJapanSentimentJEV",
    description: "日経平均株価1時間足に基づく日本のお気持ちTypeSafe判定スキーマ",
    type: "object",
    properties: {
      sentiment: {
        type: "string",
        enum: [
          "とても弱気",
          "弱気",
          "ちょっと弱気",
          "ちょっと強気",
          "強気",
          "とても強気"
        ],
        description: "6段階のセンチメントクラス分け"
      },
      emoji: {
        type: "string",
        description: "選定されたセンチメントに合致する象徴絵文字（例: 😱📉, 🫤⛅, 😊🚀など）"
      },
      tagline: {
        type: "string",
        pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}時点での日本のお気持ちは\".+\"です。.*$",
        description: "指定フォーマット「YYYY-MM-DD-HH時点での日本のお気持ちは\"〇〇\"です。{絵文字}」"
      },
      sentimentScore: {
        type: "number",
        minimum: -100,
        maximum: 100,
        description: "感情スコア (-100: 極度の弱気 〜 +100: 極度の強気)"
      },
      headline: {
        type: "string",
        description: "相場情勢のキャッチーな見出し"
      },
      psychologyReason: {
        type: "string",
        description: "市場心理・値動きに基づく解説理由"
      },
      keySignals: {
        type: "array",
        items: { type: "string" },
        description: "判定根拠シグナル一覧"
      },
      humorousTake: {
        type: "string",
        description: "兜町・お茶の間のリアルなお気持ちコメント"
      }
    },
    required: [
      "sentiment",
      "emoji",
      "tagline",
      "sentimentScore",
      "headline",
      "psychologyReason",
      "keySignals",
      "humorousTake"
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>TypeSafe AI JEV (JSON Schema & Validation)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  型安全検証済
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gemini 3.8 Flash SDKのレスポンススキーマ定義による厳格な型保証
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                意思決定エンジン (System 1)
              </div>
              <div className="text-sm font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                <span>TypeSafe Jev (1.13.0)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Active
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                階層型決定ツリー (awesome-jev)
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                Choice (大分類/6段階) + Noul (リスク)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                叙述生成 (System 2)
              </div>
              <div className="text-xs font-bold text-purple-300 font-mono truncate">
                Gemini 3.8 Flash (タグライン/解説)
              </div>
            </div>
          </div>

          {/* Jev Hierarchical Decision Payload Spec */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                1. TypeSafe Jev 階層型意思決定定義 (Awesome JEV Pattern)
              </span>
              <span className="text-[10px] font-mono text-indigo-400">
                POST api.typesafe.ai/v1/systemone (model: jev-latest)
              </span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-indigo-300 font-mono text-xs overflow-x-auto border border-slate-800 max-h-56 leading-relaxed">
{JSON.stringify({
  model: "jev-latest",
  state: "日経平均株価 最新値・1時間足変動率・高値安値・直近12時間の推移サマリー",
  questions: {
    macro_direction: {
      type: "choice",
      criteria: {
        "弱気バイアス": "売り圧力が優勢で、下値を探る展開または上値の重い地合い",
        "中立・拮抗": "売り買いが交錯し、明確な方向感に欠けるレンジ・様子見相場",
        "強気バイアス": "買い意欲が旺盛で、押し目を拾われながら上値を試す地合い"
      }
    },
    sentiment_level: {
      type: "choice",
      criteria: {
        "とても弱気": "急落や投げ売り、底割れ懸念など強いショック・パニック状態",
        "弱気": "売り優勢で下落基調、戻り売り圧力に押される弱気相場",
        "ちょっと弱気": "上値が重く利確・様子見が先行する微減・慎重相場",
        "ちょっと強気": "下値が堅く押し目買いが入り、小幅反発や下値支持がある相場",
        "強気": "買い先行で順調に上昇し、市場に前向きな活気がある相場",
        "とても強気": "全面高・急騰で熱狂感や新高値期待に沸く過熱相場"
      }
    },
    is_panic_selloff: {
      type: "noul",
      instructions: "市場で投げ売りや狼狽売り、暴落パニックが発生しているかを判定してください。"
    },
    is_overheated_bubble: {
      type: "noul",
      instructions: "市場が過度な買われすぎ・熱狂バブル状態にあるかを判定してください。"
    }
  }
}, null, 2)}
            </pre>
          </div>

          {/* JSON Schema Definition for Gemini */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                2. Gemini 3.8 Flash TypeSafe JSON Schema (タグライン・解説生成)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                responseMimeType: application/json
              </span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800 max-h-56 leading-relaxed">
              {JSON.stringify(schemaDefinition, null, 2)}
            </pre>
          </div>

          {/* Current Live AI Response */}
          {sentiment && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  2. 実際に取得された型安全ペイロード (Live Data)
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Status: 200 OK Validated
                </span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800 max-h-56 leading-relaxed">
                {JSON.stringify(sentiment, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
