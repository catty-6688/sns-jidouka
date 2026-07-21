import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type InstantRequest = {
  rawText: string;
  character?: string;
  profileHistory?: string;
  personalExperiences?: string;
  tone?: string;
};

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractText(text: string) {
  return text
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "OPENAI_API_KEYが設定されていません。" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<InstantRequest> | null;
  const rawText = pickString(body?.rawText);

  if (!rawText) {
    return NextResponse.json({ message: "整えたい言葉を入力してください。" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "developer",
          content:
            "あなたは日本語Threads投稿の編集者です。出力は投稿本文だけ。説明、見出し、引用符、JSONは不要です。"
        },
        {
          role: "user",
          content: `
以下のラフな言葉を、Threadsに今すぐ投稿できる自然な文章に整えてください。

ラフ文:
${rawText}

投稿キャラクター:
${pickString(body?.character) || "明るく相談しやすい。現実は言うが突き放さない。"}

プロフィール・経歴・実績:
${pickString(body?.profileHistory) || "副業で試行錯誤した経験がある。AIを使った発信支援が得意。"}

使える実体験:
${pickString(body?.personalExperiences) || "AIで発信や集客の負担を軽くしてきた。"}

トーン:
${pickString(body?.tone) || "共感系"}

条件:
- 120〜220字目安
- 短文改行で読みやすく
- ですます調に寄せすぎず、近い距離感
- 実績は少しだけ自然に入れる。自慢や誇大表現にしない
- 「すぐ稼げる」表現は避ける
- 無料相談CTAは入れない。必要なら最後は軽い問いかけにする
- ラフ文の温度感は残す
          `.trim()
        }
      ]
    });

    return NextResponse.json({ text: extractText(response.output_text) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "今すぐ投稿の整形に失敗しました。" }, { status: 500 });
  }
}
