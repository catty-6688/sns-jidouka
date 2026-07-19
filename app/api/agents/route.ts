import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgentId = "research" | "buzz" | "account" | "planning" | "writing";

type AgentRequest = {
  agentId: AgentId;
  genre: string;
  target: string;
  pain: string;
  character: string;
  benchmarkAccounts: string;
  profileHistory: string;
  offer: string;
  personalExperiences: string;
  researchNotes: string;
  agentOutputs: Partial<Record<AgentId, string>>;
};

const agentLabels: Record<AgentId, string> = {
  research: "リサーチ社員",
  buzz: "バズ分析社員",
  account: "自アカ分析社員",
  planning: "企画社員",
  writing: "投稿作成社員"
};

const agentJobs: Record<AgentId, string> = {
  research:
    "ジャンル内で伸びている投稿の材料を整理する。URLやメモがある場合は、要点、想定読者、伸びた理由、使える型を抽出する。URLやメモが不足している場合は、今日見るべき検索キーワード、探す基準、貼ってほしい情報を具体的に出す。",
  buzz:
    "リサーチ内容を分解し、なぜ伸びたかを分析する。フック、共感、逆張り、体験、専門性、CTA、コメントが付きやすい余白に分けて、このアカウントに移せる型だけを抽出する。",
  account:
    "このアカウント自身の勝ちパターンを分析する。投稿後の表示、いいね、返信、保存されそうな要素、無料相談につながりそうなCTAを見て、次に増やす表現と減らす表現を出す。数字が不足している場合は、記録テンプレを作る。",
  planning:
    "リサーチ、バズ分析、自アカ分析、体験データをもとに、7日分の投稿テーマを作る。MLM集客疲れ、副業迷子、美容好き、自分を知りたい人に届く流れにし、すぐ稼ぎたい人は自然に対象外にする。",
  writing:
    "1週間分のThreads投稿案を作るための執筆指示書を作る。参考投稿から移すのは構成とフックの型だけに限定し、言葉を写さない。各投稿に実体験を入れ、足りないところは【ここに体験】と示す。"
};

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateBody(body: unknown): AgentRequest | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const agentId = pickString(data.agentId) as AgentId;
  const agents = ["research", "buzz", "account", "planning", "writing"];

  if (!agents.includes(agentId)) return null;

  return {
    agentId,
    genre: pickString(data.genre),
    target: pickString(data.target),
    pain: pickString(data.pain),
    character: pickString(data.character),
    benchmarkAccounts: pickString(data.benchmarkAccounts),
    profileHistory: pickString(data.profileHistory),
    offer: pickString(data.offer),
    personalExperiences: pickString(data.personalExperiences),
    researchNotes: pickString(data.researchNotes),
    agentOutputs:
      data.agentOutputs && typeof data.agentOutputs === "object"
        ? (data.agentOutputs as Partial<Record<AgentId, string>>)
        : {}
  };
}

function buildPrompt(body: AgentRequest) {
  const previousOutputs = Object.entries(body.agentOutputs)
    .filter(([, value]) => pickString(value))
    .map(([key, value]) => `## ${agentLabels[key as AgentId]}\n${value}`)
    .join("\n\n");

  return `
あなたは「${agentLabels[body.agentId]}」です。

今回の仕事:
${agentJobs[body.agentId]}

アカウント情報:
- 発信ジャンル: ${body.genre || "未入力"}
- 想定読者: ${body.target || "未入力"}
- 悩み・対象外: ${body.pain || "未入力"}
- 投稿キャラクター・個性: ${
    body.character ||
    "未確定。決まっていない場合は、候補を3つ出して、向いている理由も書く。"
  }
- ベンチマークアカウント: ${
    body.benchmarkAccounts ||
    "未設定。未設定の場合は、どんなアカウントを3つ選ぶべきか条件を出す。"
  }
- プロフィール・過去経歴:
${body.profileHistory || "未設定。足りない場合は、追加で聞くべきプロフィール項目を出す。"}
- CTA/導線: ${body.offer || "無料相談の予約"}

使える実体験・思想:
${body.personalExperiences || "まだ不足。足りない箇所は【ここに体験】と示す。"}

貼り付け済みリサーチ・過去投稿メモ:
${body.researchNotes || "まだ不足。何を貼るべきかも具体的に指示する。"}

他のAI社員の成果物:
${previousOutputs || "まだありません。"}

出力ルール:
- 日本語で、見出しつきMarkdown
- そのまま次のAI社員に渡せる成果物にする
- 参考投稿から言葉は写さず、構成・フック・視点だけを抽出する
- ベンチマークアカウントがある場合、言葉や固有表現は真似せず、伸びている型だけをこのアカウント用に変換する
- プロフィール・過去経歴から使える失敗、転機、実績、思想を抽出し、属人性のある投稿につなげる
- 誇大表現、断定、楽に稼げる表現は避ける
- Threads本文は短めが前提。1投稿120〜220字で刺さる設計にする
- 最後に「次に人間が確認すること」を3つ以内で書く
  `.trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: ".env.localにOPENAI_API_KEYが設定されていません。" },
      { status: 500 }
    );
  }

  const body = validateBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ message: "AI社員の指定が正しくありません。" }, { status: 400 });
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
            "あなたは日本語SNS運用チームの優秀なAI社員です。役割を守り、次工程が使いやすい成果物を作ります。"
        },
        {
          role: "user",
          content: buildPrompt(body)
        }
      ]
    });

    return NextResponse.json({
      agentId: body.agentId,
      label: agentLabels[body.agentId],
      output: response.output_text
    });
  } catch (error) {
    console.error(error);

    if (error instanceof OpenAI.APIError) {
      const detail = [error.status, error.code, error.message].filter(Boolean).join(" / ");
      return NextResponse.json({ message: `OpenAI APIでエラーが出ました。${detail}` }, { status: 500 });
    }

    return NextResponse.json({ message: "AI社員の作業に失敗しました。" }, { status: 500 });
  }
}
