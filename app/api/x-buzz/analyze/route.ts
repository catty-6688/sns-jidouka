import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { ThreadsDraftIdea, XBuzzAnalyzeResult, XPostAnalysis, XTrendingPost } from "@/app/lib/x-buzz/types";

export const runtime = "nodejs";

type AnalyzeRequest = {
  post: XTrendingPost;
  profile: {
    genre: string;
    target: string;
    tone: string;
    character: string;
    offer: string;
    personalExperiences: string;
    recentOwnPosts: string;
  };
};

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function removeHashtags(value: string) {
  return value
    .replace(/(?:^|\s)[#＃][^\s#＃]+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractJson(text: string): XBuzzAnalyzeResult {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as XBuzzAnalyzeResult;

  return {
    analysis: normalizeAnalysis(parsed.analysis),
    drafts: Array.isArray(parsed.drafts) ? parsed.drafts.slice(0, 3).map(normalizeDraft) : []
  };
}

function normalizeAnalysis(value: Partial<XPostAnalysis> | undefined): XPostAnalysis {
  return {
    topic: pickString(value?.topic),
    viralReason: pickString(value?.viralReason),
    hookPattern: pickString(value?.hookPattern),
    emotion: pickString(value?.emotion),
    structure: Array.isArray(value?.structure) ? value.structure.map(pickString).filter(Boolean) : [],
    beginnerAngle: pickString(value?.beginnerAngle),
    businessAngle: pickString(value?.businessAngle),
    reliability: pickString(value?.reliability),
    needsFactCheck: Boolean(value?.needsFactCheck),
    riskLevel: value?.riskLevel === "high" || value?.riskLevel === "medium" ? value.riskLevel : "low",
    brandFitScore: typeof value?.brandFitScore === "number" ? value.brandFitScore : 70,
    originalValueIdeas: Array.isArray(value?.originalValueIdeas)
      ? value.originalValueIdeas.map(pickString).filter(Boolean)
      : []
  };
}

function normalizeDraft(value: Partial<ThreadsDraftIdea>): ThreadsDraftIdea {
  const type =
    value.type === "体験・意見" || value.type === "導線あり" || value.type === "初心者向け"
      ? value.type
      : "初心者向け";

  return {
    type,
    opening: removeHashtags(pickString(value.opening)),
    body: removeHashtags(pickString(value.body)),
    closing: removeHashtags(pickString(value.closing)),
    cta: pickString(value.cta),
    hashtags: [],
    similarityRisk:
      value.similarityRisk === "high" || value.similarityRisk === "medium" ? value.similarityRisk : "low",
    similarityScore: typeof value.similarityScore === "number" ? value.similarityScore : 20,
    needsFactCheck: Boolean(value.needsFactCheck),
    originalInfoNeeded: pickString(value.originalInfoNeeded)
  };
}

function mockAnalyze(post: XTrendingPost): XBuzzAnalyzeResult {
  const analysis: XPostAnalysis = {
    topic: post.text.includes("副業") ? "副業を続けるためのAI活用" : "AI活用と発信の負担を軽くする考え方",
    viralReason: "読者が感じているモヤモヤを短く言語化し、すぐ試せる行動に落としているため。",
    hookPattern: "常識を少しずらす一文から入る型",
    emotion: "自分もそこで止まっていた、という安心感",
    structure: ["結論", "よくある誤解", "小さな改善案", "軽い問い"],
    beginnerAngle: "まずAIに丸投げせず、悩みを分解するところから伝える。",
    businessAngle: "属人化している発信作業を手順化する切り口にできる。",
    reliability: "一般的な経験談として扱うなら低リスク。数値や効果を断定する場合は確認が必要。",
    needsFactCheck: false,
    riskLevel: "low",
    brandFitScore: 86,
    originalValueIdeas: ["副業で遠回りした経験", "AIで投稿作りがラクになった具体例", "看護師や忙しい人向けの時間不足感"]
  };

  return {
    analysis,
    drafts: [
      {
        type: "初心者向け",
        opening: "AI投稿がうまくいかない時、文章力より先に見るところがあります。",
        body:
          "いきなり本文を作らせるより、まずは\n「誰に、何を伝えたいか」\nをAIと一緒に整理するのがおすすめです。\n\nここが曖昧なままだと、きれいだけど刺さらない文章になりやすいです。",
        closing: "まずはネタ出しより、悩みの分解からで大丈夫です✨",
        cta: "なし",
        hashtags: [],
        similarityRisk: "low",
        similarityScore: 18,
        needsFactCheck: false,
        originalInfoNeeded: "自分がAIで投稿作成をラクにした具体例を1つ入れると強くなります。"
      },
      {
        type: "体験・意見",
        opening: "副業で遠回りしてきたから思うんだけど、続かない理由って根性だけじゃないです。",
        body:
          "毎回ゼロから考えるほど、発信ってしんどくなります。\n\n私もいろいろ試して、やっとAIで\nネタ出し→構成→下書き\nまで分けるようになってラクになりました。",
        closing: "がんばる前に、仕組みを小さく作るの大事です。",
        cta: "なし",
        hashtags: [],
        similarityRisk: "low",
        similarityScore: 22,
        needsFactCheck: false,
        originalInfoNeeded: "副業で失敗した体験を1文だけ足すと、あなたらしさが出ます。"
      },
      {
        type: "導線あり",
        opening: "AIを使っても投稿が止まる人は、使い方が悪いんじゃなくて順番が違うかもしれません。",
        body:
          "最初にやるのは、文章を作ることより\n悩み・読者・言いたいことを整理すること。\n\nここが見えると、投稿作りはかなり軽くなります。",
        closing: "自分の場合どこで止まってるか、整理したい人は声かけてくださいね。",
        cta: "軽い相談導線",
        hashtags: [],
        similarityRisk: "medium",
        similarityScore: 38,
        needsFactCheck: false,
        originalInfoNeeded: "無料相談に誘導するなら、何を一緒に整理できるかを明確にしてください。"
      }
    ]
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<AnalyzeRequest> | null;

  if (!body?.post?.text) {
    return NextResponse.json({ message: "分析するX投稿が見つかりません。" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(mockAnalyze(body.post));

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "developer",
          content:
            "あなたはSNS投稿の分析者です。X投稿の文章をコピーせず、話題・切り口・構成だけを抽出してThreads案を作ります。必ずJSONだけで返してください。"
        },
        {
          role: "user",
          content: `
X投稿:
${body.post.text}

元投稿URL:
${body.post.postUrl}

反応:
いいね ${body.post.likeCount}
リポスト ${body.post.repostCount}
返信 ${body.post.replyCount}
引用 ${body.post.quoteCount}
表示 ${body.post.impressionCount || "不明"}
バズ度 ${body.post.buzzScore}

自アカウント情報:
ジャンル: ${body.profile?.genre || ""}
想定読者: ${body.profile?.target || ""}
トーン: ${body.profile?.tone || ""}
投稿キャラクター: ${body.profile?.character || ""}
CTA/導線: ${body.profile?.offer || ""}
使える実体験: ${body.profile?.personalExperiences || ""}
最近の自分の投稿: ${body.profile?.recentOwnPosts || ""}

条件:
- 元投稿の言葉を写さない
- 参考にするのは話題、切り口、構成だけ
- Threads投稿案を3案作る
- 1案目: 初心者向け
- 2案目: 体験・意見を加える
- 3案目: LINEやサービス導線を意識。ただし売り込みすぎない
- 日本語、短文改行、AIっぽくしない
- 絵文字は自然に0〜2個
- Threadsではハッシュタグを付けない。本文末にも#タグを入れず、hashtagsは必ず空配列にする
- 事実確認が必要なら needsFactCheck true

JSON形式:
{
  "analysis": {
    "topic": "",
    "viralReason": "",
    "hookPattern": "",
    "emotion": "",
    "structure": [],
    "beginnerAngle": "",
    "businessAngle": "",
    "reliability": "",
    "needsFactCheck": true,
    "riskLevel": "low",
    "brandFitScore": 80,
    "originalValueIdeas": []
  },
  "drafts": [
    {
      "type": "初心者向け",
      "opening": "",
      "body": "",
      "closing": "",
      "cta": "",
      "hashtags": [],
      "similarityRisk": "low",
      "similarityScore": 20,
      "needsFactCheck": false,
      "originalInfoNeeded": ""
    }
  ]
}
          `.trim()
        }
      ]
    });

    return NextResponse.json(extractJson(response.output_text));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "AI分析とThreads案生成に失敗しました。" }, { status: 500 });
  }
}
