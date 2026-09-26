import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { HourlyQuote, SentimentAnalysis, SentimentLevel, SENTIMENT_LEVELS } from './src/types/sentiment';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Format timestamp to JST YYYY-MM-DD-HH
function formatJSTHour(timestampMs: number): { dateHourStr: string; displayTime: string; isoTime: string } {
  const d = new Date(timestampMs);
  const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = jstFormatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const yyyy = partMap.year;
  const mm = partMap.month;
  const dd = partMap.day;
  const hh = partMap.hour;
  const min = partMap.minute;

  const dateHourStr = `${yyyy}-${mm}-${dd}-${hh}`;
  const displayTime = `${mm}/${dd} ${hh}:${min}`;
  const isoTime = d.toISOString();

  return { dateHourStr, displayTime, isoTime };
}

function determineHourSentiment(changePercent: number): { sentiment: SentimentLevel; emoji: string } {
  let sentiment: SentimentLevel = 'ちょっと強気';
  if (changePercent <= -1.2) {
    sentiment = 'とても弱気';
  } else if (changePercent < -0.3) {
    sentiment = '弱気';
  } else if (changePercent < 0) {
    sentiment = 'ちょっと弱気';
  } else if (changePercent >= 1.2) {
    sentiment = 'とても強気';
  } else if (changePercent >= 0.3) {
    sentiment = '強気';
  } else {
    sentiment = 'ちょっと強気';
  }
  const meta = SENTIMENT_LEVELS[sentiment];
  return { sentiment, emoji: meta.emoji };
}

// Fetch 1-hour interval historical data for Nikkei 225 (^N225)
async function fetchNikkei1HourData(): Promise<HourlyQuote[]> {
  const symbol = '%5EN225'; // ^N225 url encoded
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1h`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API responded with status ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error('No chart data returned from Yahoo Finance');
  }

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) {
    throw new Error('Quote indicators missing from Yahoo Finance response');
  }

  const opens: (number | null)[] = quote.open || [];
  const highs: (number | null)[] = quote.high || [];
  const lows: (number | null)[] = quote.low || [];
  const closes: (number | null)[] = quote.close || [];
  const volumes: (number | null)[] = quote.volume || [];

  const quotes: HourlyQuote[] = [];
  let prevClose = 0;

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const volume = volumes[i] ?? 0;

    // Skip empty bars
    if (close === null || close === undefined || isNaN(close)) continue;

    const timestampMs = timestamps[i] * 1000;
    const { dateHourStr, displayTime, isoTime } = formatJSTHour(timestampMs);

    const actualOpen = open !== null && !isNaN(open) ? open : close;
    const actualHigh = high !== null && !isNaN(high) ? high : Math.max(actualOpen, close);
    const actualLow = low !== null && !isNaN(low) ? low : Math.min(actualOpen, close);

    const baseForChange = prevClose > 0 ? prevClose : actualOpen;
    const change = close - baseForChange;
    const changePercent = baseForChange > 0 ? (change / baseForChange) * 100 : 0;
    const { sentiment: hourSentiment, emoji: hourEmoji } = determineHourSentiment(changePercent);

    quotes.push({
      timestamp: timestampMs,
      isoTime,
      dateHourStr,
      displayTime,
      open: Math.round(actualOpen * 100) / 100,
      high: Math.round(actualHigh * 100) / 100,
      low: Math.round(actualLow * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      sentiment: hourSentiment,
      emoji: hourEmoji,
    });

    prevClose = close;
  }

  return quotes;
}

// Call TypeSafe AI Jev System One Model API for hierarchical decisions
async function callTypeSafeJevHierarchical(stateSummary: string): Promise<{
  macroDirection?: string;
  sentimentLevel?: SentimentLevel;
  confidence?: number;
  probabilities?: Record<string, number>;
  isPanicSellingProb?: number;
  isOverheatedBubbleProb?: number;
} | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;

  try {
    const payload = {
      model: 'jev-latest',
      state: stateSummary,
      questions: {
        macro_direction: {
          type: 'choice',
          criteria: {
            '弱気バイアス': '売り圧力が優勢で、下値を探る展開または上値の重い地合い',
            '中立・拮抗': '売り買いが交錯し、明確な方向感に欠けるレンジ・様子見相場',
            '強気バイアス': '買い意欲が旺盛で、押し目を拾われながら上値を試す地合い',
          },
        },
        sentiment_level: {
          type: 'choice',
          criteria: {
            'とても弱気': '急落や投げ売り、底割れ懸念など強いショック・パニック状態',
            '弱気': '売り優勢で下落基調、戻り売り圧力に押される弱気相場',
            'ちょっと弱気': '上値が重く利確・様子見が先行する微減・慎重相場',
            'ちょっと強気': '下値が堅く押し目買いが入り、小幅反発や下値支持がある相場',
            '強気': '買い先行で順調に上昇し、市場に前向きな活気がある相場',
            'とても強気': '全面高・急騰で熱狂感や新高値期待に沸く過熱相場',
          },
        },
        is_panic_selloff: {
          type: 'noul',
          instructions: '市場で投げ売りや狼狽売り、暴落パニックが発生しているかを判定してください。',
        },
        is_overheated_bubble: {
          type: 'noul',
          instructions: '市場が過度な買われすぎ・熱狂バブル状態にあるかを判定してください。',
        },
      },
    };

    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`TypeSafe Jev API returned status ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    const answers = data?.answers || {};

    const macro = answers.macro_direction?.choice;
    const sentiment = answers.sentiment_level?.choice as SentimentLevel | undefined;
    const confidence = answers.sentiment_level?.confidence;
    const probabilities = answers.sentiment_level?.probabilities;
    const isPanicSellingProb = answers.is_panic_selloff?.noul;
    const isOverheatedBubbleProb = answers.is_overheated_bubble?.noul;

    return {
      macroDirection: macro,
      sentimentLevel: sentiment,
      confidence,
      probabilities,
      isPanicSellingProb,
      isOverheatedBubbleProb,
    };
  } catch (err) {
    console.warn('Error calling TypeSafe Jev API:', err);
    return null;
  }
}

// Fallback rule-based sentiment if AI is unavailable
function calculateFallbackSentiment(quotes: HourlyQuote[], targetPoint?: HourlyQuote): SentimentAnalysis {
  const current = targetPoint || quotes[quotes.length - 1];
  const changePercent = current.changePercent;
  const { sentiment, emoji } = determineHourSentiment(changePercent);
  const meta = SENTIMENT_LEVELS[sentiment];
  const score = Math.round((meta.scoreRange[0] + meta.scoreRange[1]) / 2);
  const tagline = `${current.dateHourStr}時点での日本のお気持ちは"${sentiment}"です。${emoji}`;

  return {
    sentiment,
    emoji,
    tagline,
    sentimentScore: score,
    headline: `日経平均 ${current.close.toLocaleString()}円 (${changePercent >= 0 ? '+' : ''}${changePercent}%) における市場心理`,
    psychologyReason: `直近1時間の変動率(${changePercent >= 0 ? '+' : ''}${changePercent}%)に基づく判定。${meta.description}`,
    keySignals: [
      `現在値: ${current.close.toLocaleString('ja-JP')} 円`,
      `直近1時間変動: ${changePercent >= 0 ? '+' : ''}${changePercent}% (${current.change >= 0 ? '+' : ''}${current.change} 円)`,
      `高値安値レンジ: ${(current.high - current.low).toFixed(1)} 円`,
    ],
    humorousTake: `市場のお茶の間でも「${sentiment}」な空気が漂っています。一服入れて様子を見るのも吉。`,
    pointInTime: current.dateHourStr,
    analyzedPrice: current.close,
    analyzedChangePercent: changePercent,
  };
}

// TypeSafe AI with Jev System One + Gemini 3.8 Flash Hybrid Pipeline
async function analyzeSentimentWithTypeSafeAI(
  quotes: HourlyQuote[],
  targetPoint?: HourlyQuote
): Promise<SentimentAnalysis> {
  const current = targetPoint || quotes[quotes.length - 1];
  const recentQuotes = quotes.slice(-12); // Last 12 hours
  const dateHourStr = current.dateHourStr;

  const dataSummary = {
    analyzedHour: dateHourStr,
    latestPrice: current.close,
    oneHourChangePercent: current.changePercent,
    oneHourPriceChange: current.change,
    hourlyHigh: current.high,
    hourlyLow: current.low,
    hourlyVolume: current.volume,
    recentTrend: recentQuotes.map((q) => ({
      hour: q.dateHourStr,
      price: q.close,
      changePercent: q.changePercent,
    })),
  };

  const stateSummary = `日経平均株価 最新値: ${current.close.toLocaleString()}円 (1時間前比: ${
    current.change >= 0 ? '+' : ''
  }${current.change}円, ${current.changePercent >= 0 ? '+' : ''}${
    current.changePercent
  }%). 高値: ${current.high}円, 安値: ${current.low}円. 対象時間帯: ${dateHourStr}. 直近12時間の値動き: [${recentQuotes
    .map((q) => `${q.displayTime}: ${q.changePercent}%`)
    .join(', ')}].`;

  // Step 1: Attempt TypeSafe Jev System One Hierarchical Decision
  let jevResult: Awaited<ReturnType<typeof callTypeSafeJevHierarchical>> = null;
  if (process.env.TYPESAFE_API_KEY) {
    jevResult = await callTypeSafeJevHierarchical(stateSummary);
  }

  const prompt = `
あなたは日本の株式市場（日経平均株価）の心理・センチメントを分析する金融アナリスト兼お気持ちアナリストです。
提供された日経平均株価の1時間ごとのヒストリカルデータをもとに、対象時点(${dateHourStr})における日本のお気持ちを解説・表現してください。

${
  jevResult?.sentimentLevel
    ? `【TypeSafe Jev System One 決定モデルによる確定判定】
- 大分類マクロ地合い: "${jevResult.macroDirection}"
- 確定6段階お気持ちクラス: "${jevResult.sentimentLevel}" (確信度: ${Math.round(
        (jevResult.confidence || 0) * 100
      )}%)
- 狼狽売り・パニック確率: ${Math.round((jevResult.isPanicSellingProb || 0) * 100)}%
- 過熱バブル警戒確率: ${Math.round((jevResult.isOverheatedBubbleProb || 0) * 100)}%
必ず上記Jev判定のクラス "${jevResult.sentimentLevel}" をセンチメントとして採用してください。`
    : `【センチメントの6段階クラス】
必ず以下の6つのいずれか1つを選定してください:
1. "とても弱気" (急落、投げ売り、ショック安、底割れ懸念など)
2. "弱気" (下落基調、戻り売り圧力、利益確定売り先行など)
3. "ちょっと弱気" (上値が重い、様子見、小幅続落、微減など)
4. "ちょっと強気" (底堅い、小幅反発、押し目買い、プラス圏推移など)
5. "強気" (力強い上昇、全面高、ブレイクアウト、買い先行など)
6. "とても強気" (急騰、お祭り騒ぎ、バブル感、新高値更新など)`
}

【タグラインの指定フォーマット】
タグラインは必ず次のフォーマットで出力してください:
「${dateHourStr}時点での日本のお気持ちは"${
    jevResult?.sentimentLevel || '【選んだ6段階クラス】'
  }"です。{そのお気持ちにふさわしい絵文字}」
例: 「${dateHourStr}時点での日本のお気持ちは"ちょっと弱気"です。🫤⛅」
例: 「${dateHourStr}時点での日本のお気持ちは"強気"です。😊🚀」

【データ】
${JSON.stringify(dataSummary, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'あなたは日経平均のリアルタイム感情インデックス判定AIです。TypeSafeなJSON形式で出力してください。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              enum: ['とても弱気', '弱気', 'ちょっと弱気', 'ちょっと強気', '強気', 'とても強気'],
              description: '6段階のセンチメントクラス',
            },
            emoji: {
              type: Type.STRING,
              description: '選定されたセンチメントに合致する絵文字（例: 😱📉, 😰🌧️, 🫤⛅, 🙂🌤️, 😊🚀, 🤩🔥）',
            },
            tagline: {
              type: Type.STRING,
              description:
                '「YYYY-MM-DD-HH時点での日本のお気持ちは\\"〇〇\\"です。{絵文字}」フォーマットのタグライン',
            },
            sentimentScore: {
              type: Type.NUMBER,
              description: '-100(極度の弱気)から+100(極度の強気)のスコア',
            },
            headline: {
              type: Type.STRING,
              description: '相場状況を表すキャッチーな見出し',
            },
            psychologyReason: {
              type: Type.STRING,
              description: 'なぜこのお気持ち判定になったかの市場心理・値動きに基づく分析',
            },
            keySignals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '判定根拠となったシグナルや相場動向（3〜4点）',
            },
            humorousTake: {
              type: Type.STRING,
              description: '日本の投資家やビジネス街の雰囲気を反映したユーモア溢れる一言コメント',
            },
          },
          required: [
            'sentiment',
            'emoji',
            'tagline',
            'sentimentScore',
            'headline',
            'psychologyReason',
            'keySignals',
            'humorousTake',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini AI');
    }

    const parsed = JSON.parse(text);

    // Validate sentiment value strictly against the 6 classes
    const validSentiments: SentimentLevel[] = ['とても弱気', '弱気', 'ちょっと弱気', 'ちょっと強気', '強気', 'とても強気'];
    const chosenSentiment: SentimentLevel = jevResult?.sentimentLevel || (
      validSentiments.includes(parsed.sentiment)
        ? (parsed.sentiment as SentimentLevel)
        : 'ちょっと強気'
    );

    const meta = SENTIMENT_LEVELS[chosenSentiment];
    const emoji = parsed.emoji || meta.emoji;
    const formattedTagline = `${dateHourStr}時点での日本のお気持ちは"${chosenSentiment}"です。${emoji}`;

    return {
      sentiment: chosenSentiment,
      emoji,
      tagline: formattedTagline,
      sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : meta.scoreRange[0] + 10,
      headline: parsed.headline || `${dateHourStr} の市場センチメント分析`,
      psychologyReason: parsed.psychologyReason || meta.description,
      keySignals: Array.isArray(parsed.keySignals) && parsed.keySignals.length > 0 ? parsed.keySignals : [meta.description],
      humorousTake: parsed.humorousTake || '波に乗るか、静観するか。日本の相場は今日も動いています。',
      pointInTime: dateHourStr,
      analyzedPrice: current.close,
      analyzedChangePercent: current.changePercent,
      macroDirection: jevResult?.macroDirection,
      confidence: jevResult?.confidence,
      probabilities: jevResult?.probabilities,
      isPanicSellingProb: jevResult?.isPanicSellingProb,
      isOverheatedBubbleProb: jevResult?.isOverheatedBubbleProb,
      engineUsed: jevResult ? 'jev_systemone' : 'gemini_flash',
    };
  } catch (err) {
    console.warn('Gemini text generation failed or timed out:', err);
    if (jevResult?.sentimentLevel) {
      const meta = SENTIMENT_LEVELS[jevResult.sentimentLevel];
      const emoji = meta.emoji;
      const formattedTagline = `${dateHourStr}時点での日本のお気持ちは"${jevResult.sentimentLevel}"です。${emoji}`;

      return {
        sentiment: jevResult.sentimentLevel,
        emoji,
        tagline: formattedTagline,
        sentimentScore: typeof jevResult.confidence === 'number' ? Math.round((meta.scoreRange[0] + meta.scoreRange[1]) / 2) : 10,
        headline: `日経平均 ${current.close.toLocaleString()}円 (${current.changePercent >= 0 ? '+' : ''}${current.changePercent}%) - ${jevResult.macroDirection || 'Jev市場判定'}`,
        psychologyReason: `TypeSafe Jev System One による階層型決定ツリー判定。大分類: ${jevResult.macroDirection}、確定判定: ${jevResult.sentimentLevel} (確信度: ${Math.round((jevResult.confidence || 0) * 100)}%)。`,
        keySignals: [
          `Jevマクロ地合い: ${jevResult.macroDirection}`,
          `Jev判定確信度: ${Math.round((jevResult.confidence || 0) * 100)}%`,
          `狼狽売りリスク: ${Math.round((jevResult.isPanicSellingProb || 0) * 100)}%`,
          `過熱バブル感: ${Math.round((jevResult.isOverheatedBubbleProb || 0) * 100)}%`,
        ],
        humorousTake: `TypeSafe Jev System One の高精度判定により、現在の日本のお気持ちは「${jevResult.sentimentLevel}」と決定されました。`,
        pointInTime: dateHourStr,
        analyzedPrice: current.close,
        analyzedChangePercent: current.changePercent,
        macroDirection: jevResult.macroDirection,
        confidence: jevResult.confidence,
        probabilities: jevResult.probabilities,
        isPanicSellingProb: jevResult.isPanicSellingProb,
        isOverheatedBubbleProb: jevResult.isOverheatedBubbleProb,
        engineUsed: 'jev_systemone',
      };
    }

    const fallback = calculateFallbackSentiment(quotes, targetPoint);
    return {
      ...fallback,
      engineUsed: 'fallback_rule',
    };
  }
}

// In-memory cache to prevent excessive requests
let cachedMarketData: {
  timestamp: number;
  data: any;
} | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// API Routes
app.get('/api/market-sentiment', async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedMarketData && now - cachedMarketData.timestamp < CACHE_TTL_MS) {
      return res.json(cachedMarketData.data);
    }

    const quotes = await fetchNikkei1HourData();
    if (quotes.length === 0) {
      return res.status(500).json({ error: '日経平均データの取得に失敗しました。' });
    }

    const latestQuote = quotes[quotes.length - 1];
    const sentiment = await analyzeSentimentWithTypeSafeAI(quotes, latestQuote);

    // Sync latest quote's sentiment with the AI analyzed result
    latestQuote.sentiment = sentiment.sentiment;
    latestQuote.emoji = sentiment.emoji;

    // Calculate historical sentiment labels for each hour on the chart
    const historicalTimeline = quotes.map((q) => {
      const isLatest = q.dateHourStr === latestQuote.dateHourStr;
      return {
        dateHourStr: q.dateHourStr,
        close: q.close,
        sentiment: isLatest ? sentiment.sentiment : q.sentiment,
        emoji: isLatest ? sentiment.emoji : q.emoji,
      };
    });

    sentiment.historicalSentimentTimeline = historicalTimeline;

    const payload = {
      symbol: '^N225',
      name: '日経平均株価 (Nikkei 225)',
      currency: 'JPY',
      currentPrice: latestQuote.close,
      priceChange: latestQuote.change,
      priceChangePercent: latestQuote.changePercent,
      lastUpdated: new Date().toISOString(),
      latestHourStr: latestQuote.dateHourStr,
      history: quotes,
      sentiment,
    };

    cachedMarketData = {
      timestamp: now,
      data: payload,
    };

    res.json(payload);
  } catch (error: any) {
    console.error('Error fetching market sentiment:', error);
    res.status(500).json({
      error: error.message || 'データ取得中にエラーが発生しました。',
    });
  }
});

// Analyze a specific historical point selected by user
app.post('/api/analyze-point', async (req, res) => {
  try {
    const { dateHourStr } = req.body;
    const quotes = await fetchNikkei1HourData();
    const targetQuote = quotes.find((q) => q.dateHourStr === dateHourStr) || quotes[quotes.length - 1];
    const sentiment = await analyzeSentimentWithTypeSafeAI(quotes, targetQuote);

    const historicalTimeline = quotes.map((q) => {
      const isSelected = q.dateHourStr === targetQuote.dateHourStr;
      return {
        dateHourStr: q.dateHourStr,
        close: q.close,
        sentiment: isSelected ? sentiment.sentiment : q.sentiment,
        emoji: isSelected ? sentiment.emoji : q.emoji,
      };
    });
    sentiment.historicalSentimentTimeline = historicalTimeline;

    res.json({ quote: targetQuote, sentiment, history: quotes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware integration for dev mode or static files for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
