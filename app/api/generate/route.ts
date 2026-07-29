import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const generationTimeoutMs = 120000;

type GenerateRequest = {
  mode: "single" | "weekly";
  genre: string;
  target: string;
  pain: string;
  character?: string;
  benchmarkAccounts?: string;
  profileHistory?: string;
  offer?: string;
  personalExperiences?: string;
  recentOwnPosts?: string;
  researchNotes?: string;
  tone: "やさしい" | "煽り系" | "共感系" | "プロっぽい";
  template: "basic" | "education" | "story";
};

type GeneratedPost = {
  title: string;
  body: string;
};

type GeneratedResult = {
  threads: GeneratedPost[];
  x: GeneratedPost[];
  weekly?: WeeklyDay[];
  checkpoints?: Checkpoint[];
};

type WeeklyDay = {
  day: string;
  theme: string;
  intent: string;
  posts: WeeklyPost[];
};

type WeeklyPost = {
  title: string;
  body: string;
  cta: string;
  experienceUsed: string;
  referencePattern: string;
  score: {
    novelty: string;
    personality: string;
    expertise: string;
    curiosity: string;
  };
};

type Checkpoint = {
  title: string;
  whatToCheck: string;
  decision: string;
};

const templateLabels: Record<GenerateRequest["template"], string> = {
  basic: "王道テンプレ。問題提起、気づき、AIでできる小さな一歩、軽い問いの順で書く。毎回CTAにはしない。",
  education: "教育テンプレ。初心者が学べる小さなノウハウを中心に書く。",
  story: "ストーリーテンプレ。過去の失敗や気づきから、AIでラクになった変化へつなげる。毎回CTAにはしない。"
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

function validateBody(body: unknown): GenerateRequest | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const mode = pickString(data.mode) === "weekly" ? "weekly" : "single";
  const genre = pickString(data.genre);
  const target = pickString(data.target);
  const pain = pickString(data.pain);
  const character = pickString(data.character);
  const benchmarkAccounts = pickString(data.benchmarkAccounts);
  const profileHistory = pickString(data.profileHistory);
  const offer = pickString(data.offer);
  const personalExperiences = pickString(data.personalExperiences);
  const recentOwnPosts = pickString(data.recentOwnPosts);
  const researchNotes = pickString(data.researchNotes);
  const tone = pickString(data.tone) as GenerateRequest["tone"];
  const template = pickString(data.template) as GenerateRequest["template"];

  const tones = ["やさしい", "煽り系", "共感系", "プロっぽい"];
  const templates = ["basic", "education", "story"];

  if (!genre || !target || !pain) return null;
  if (!tones.includes(tone)) return null;
  if (!templates.includes(template)) return null;

  return {
    mode,
    genre,
    target,
    pain,
    character,
    benchmarkAccounts,
    profileHistory,
    offer,
    personalExperiences,
    recentOwnPosts,
    researchNotes,
    tone,
    template
  };
}

function extractJson(text: string): GeneratedResult {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeneratedResult;
  if (!Array.isArray(parsed.threads) || !Array.isArray(parsed.x)) {
    throw new Error("Invalid response shape");
  }

  return {
    threads: parsed.threads.slice(0, 3).map((post, index) => ({
      title: pickString(post.title) || `Threads投稿 ${index + 1}`,
      body: removeHashtags(pickString(post.body))
    })),
    x: parsed.x.slice(0, 3).map((post, index) => ({
      title: pickString(post.title) || `X投稿 ${index + 1}`,
      body: removeHashtags(pickString(post.body))
    })),
    weekly: Array.isArray(parsed.weekly)
      ? parsed.weekly.slice(0, 7).map((day, dayIndex) => ({
          day: pickString(day.day) || `${dayIndex + 1}日目`,
          theme: pickString(day.theme),
          intent: pickString(day.intent),
          posts: Array.isArray(day.posts)
            ? day.posts.slice(0, 5).map((post, postIndex) => ({
                title: pickString(post.title) || `投稿 ${postIndex + 1}`,
                body: removeHashtags(pickString(post.body)),
                cta: pickString(post.cta),
                experienceUsed: pickString(post.experienceUsed) || "【ここに体験】",
                referencePattern: pickString(post.referencePattern),
                score: {
                  novelty: pickString(post.score?.novelty),
                  personality: pickString(post.score?.personality),
                  expertise: pickString(post.score?.expertise),
                  curiosity: pickString(post.score?.curiosity)
                }
              }))
            : []
        }))
      : undefined,
    checkpoints: Array.isArray(parsed.checkpoints)
      ? parsed.checkpoints.slice(0, 4).map((checkpoint, index) => ({
          title: pickString(checkpoint.title) || `確認 ${index + 1}`,
          whatToCheck: pickString(checkpoint.whatToCheck),
          decision: pickString(checkpoint.decision)
        }))
      : undefined
  };
}

function buildPrompt(body: GenerateRequest) {
  const base = `
ジャンル: ${body.genre}
ターゲット: ${body.target}
悩み: ${body.pain}
投稿キャラクター・個性: ${
    body.character ||
    "まだ未確定。やさしく伴走する、現実的、押し売りしない、行動している人を応援する人物像として仮置きする。"
  }
ベンチマークアカウント:
${body.benchmarkAccounts || "未設定。参考にしたいアカウントがあれば、@IDやURLを最大3つ入れる。"}
プロフィール・過去経歴:
${body.profileHistory || "未設定。肩書き、過去の失敗、転機、実績、なぜ今この発信をしているかがあれば入れる。"}
投稿トーン: ${body.tone}
テンプレ: ${templateLabels[body.template]}
CTA/導線: ${body.offer || "無料相談は毎回出さない。立ち上げ初期はAIの使い方、発信の負担軽減、作業分解の投稿を中心にして、CTAは週1〜2本だけ自然に入れる。"}
使える実体験・思想・言葉:
${body.personalExperiences || "具体的な体験が不足している箇所は必ず【ここに体験】と書く。"}

最近の自分の投稿:
${body.recentOwnPosts || "未設定。未設定の場合は、自然な日本語で作るが、過度に整いすぎたAI文体は避ける。"}

参考リサーチ:
${body.researchNotes || "直近リサーチがないため、構成パターンは一般的なSNS投稿の型から作る。"}
  `.trim();

  if (body.mode === "weekly") {
    return `
次の条件で、Threads向けの1週間分投稿パックを作ってください。

${base}

目的:
- 立ち上げ初期は無料相談にすぐ引き込まない。AIについての投稿で信頼・共感・興味を育てる
- AIの使い方、発信の作業分解、投稿作成、リサーチ、キャプション作成、時短、苦手克服を中心テーマにする
- エステレラへの参加は大々的に言わない。無料相談CTAも控えめにする
- AIを教えられる強みを、ノウハウ・実例・気づきとして出す
- 「すぐ稼ぎたい」「何もしたくない」「楽して稼ぎたい」人は対象外だと自然に伝える
- MLM集客に疲れた人、副業でうまくいかなかった人、美容好き、自分の方向性を知りたい人に届くようにする

作成ルール:
- 7日分を作る
- 各日3投稿に絞る
- 各日の3投稿は「AIノウハウ投稿1本 + 共感/思想投稿1本 + 体験/小さな気づき投稿1本」を目安にする
- 通常投稿には無料相談への直接誘導を入れない。読者の共感、保存、返信、信頼形成を目的にする
- 無料相談CTAは週1〜2本だけにする。入れる日は明確にCTA投稿として自然につなげる
- Threads本文は短め。1投稿120〜220字を目安にする
- 1投稿1メッセージ。長い説明、詰め込み、説教感を避ける
- 1〜2行目で引っかかりを作り、本文は短文改行で読みやすくする
- 参考投稿から移してよいのは構成とフックの型だけ。言葉は写さない
- ベンチマークアカウントがある場合、その人たちから盗むのは言葉ではなく、テーマ選び、切り口、導入、余白、CTAの温度感だけにする
- 各投稿に実体験を最低1箇所入れる。足りない場合は【ここに体験】と示す
- プロフィール・過去経歴から語れる話がある場合は、投稿に自然に混ぜて属人性を上げる
- 各投稿に、参考にした型と移した要素を1行で書く
- 投稿評価として、新規性・属人性・専門性・興味付けをそれぞれ短く採点コメントする
- 誇大表現、断定、簡単に稼げる表現は避ける
- CTAは毎回入れない。7日分21投稿のうち、無料相談CTAは最大2本に抑える
- ctaフィールドには、通常投稿なら「なし」または「返信を促す軽い問い」を入れる。CTA投稿だけ無料相談導線を書く
- 通常投稿の最後は「あなたはどこで止まっていますか？」のような軽い問い、または余韻で終える
- AI投稿は具体例を入れる。例: 投稿ネタ出し、文章のたたき台、プロフィール整理、リサーチ、キャプション改善、作業手順化
- 最近の自分の投稿がある場合、言葉選び、改行、語尾、絵文字量、テンションを分析して寄せる
- 絵文字はゼロにしない。最近の投稿に合わせる。未設定なら1投稿0〜2個まで自然に使う
- 絵文字は文末や感情の補助だけに使い、装飾しすぎない
- 投稿前に人が確認する前提なので、承認しやすい粒度でまとめる

確認は月4回だけにする。1回の確認で7日分をまとめて確定できるように、checkpointsを4つ作る:
1. 今回の7日分の方針確認
2. 7日分テーマ確認
3. 本文と体験差し込み確認
4. 予約投稿前の最終確認

次のJSON形式だけで返してください。
{
  "threads": [
    { "title": "代表投稿タイトル", "body": "代表投稿本文" }
  ],
  "x": [
    { "title": "X用短縮タイトル", "body": "X用短縮本文" }
  ],
  "checkpoints": [
    { "title": "確認名", "whatToCheck": "確認すること", "decision": "OKなら何が確定するか" }
  ],
  "weekly": [
    {
      "day": "1日目",
      "theme": "その日のテーマ",
      "intent": "狙い",
      "posts": [
        {
          "title": "投稿タイトル",
          "body": "Threads本文",
          "cta": "CTA",
          "experienceUsed": "使った実体験。足りなければ【ここに体験】",
          "referencePattern": "参考にした投稿/型と移した要素",
          "score": {
            "novelty": "新規性の評価",
            "personality": "属人性の評価",
            "expertise": "専門性の評価",
            "curiosity": "興味付けの評価"
          }
        }
      ]
    }
  ]
}
    `.trim();
  }

  return `
次の条件でSNS投稿を生成してください。

${base}

条件:
- Threads投稿を3本
- X投稿を3本
- AIノウハウ投稿2本、共感/体験投稿1本の比率にする
- 通常投稿には無料相談への直接誘導を入れない
- 無料相談CTAは必要な時だけ。初期運用では入れない日があってよい
- 読みやすく改行済み
- 過度な誇大表現や断定は避ける
- X投稿は日本語で280文字以内を目安
- Threads投稿は短め。120〜220字を目安に、スマホで読みやすい短文改行
- 最近の自分の投稿がある場合、言葉選び、改行、語尾、絵文字量、テンションを分析して寄せる
- 絵文字はゼロにしない。未設定なら1投稿0〜2個まで自然に使う
- ハッシュタグは付けない

次のJSON形式だけで返してください。
{
  "threads": [
    { "title": "投稿タイトル", "body": "投稿本文" }
  ],
  "x": [
    { "title": "投稿タイトル", "body": "投稿本文" }
  ]
}
  `.trim();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("GENERATION_TIMEOUT")), timeoutMs);
    })
  ]);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          ".env.localにOPENAI_API_KEYが設定されていません。READMEの手順に沿って設定してください。"
      },
      { status: 500 }
    );
  }

  const body = validateBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { message: "入力内容が足りません。ジャンル、ターゲット、悩みを入力してください。" },
      { status: 400 }
    );
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  try {
    const response = await withTimeout(
      client.responses.create({
        model,
        input: [
          {
            role: "developer",
            content:
              "あなたは日本語SNSマーケティングのプロです。初心者にも使いやすい、自然でコピペしやすい投稿文を作ります。出力は必ずJSONのみです。"
          },
          {
            role: "user",
            content: buildPrompt(body)
          }
        ]
      }),
      generationTimeoutMs
    );

    const result = extractJson(response.output_text);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    if (error instanceof OpenAI.APIError) {
      const detail = [error.status, error.code, error.message]
        .filter(Boolean)
        .join(" / ");

      return NextResponse.json(
        {
          message: `OpenAI APIでエラーが出ました。${detail}`
        },
        { status: 500 }
      );
    }

    if (error instanceof Error && error.message === "GENERATION_TIMEOUT") {
      return NextResponse.json(
        {
          message:
            "投稿生成が2分を超えたため停止しました。リサーチ欄やプロフィール欄が長すぎる場合は少し短くして、もう一度試してください。"
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        message:
          "投稿生成に失敗しました。APIキー、残高、モデル名、ネット接続を確認してください。"
      },
      { status: 500 }
    );
  }
}
