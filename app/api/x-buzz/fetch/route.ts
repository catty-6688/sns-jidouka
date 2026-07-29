import { NextResponse } from "next/server";
import { createXProvider, getXProviderStatus } from "@/app/lib/x-buzz/providers";
import type { XSearchSetting } from "@/app/lib/x-buzz/types";

export const runtime = "nodejs";

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function validateSetting(value: unknown): XSearchSetting | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  return {
    id: pickString(data.id) || `setting-${Date.now()}`,
    name: pickString(data.name) || "未命名の検索条件",
    keywords: pickString(data.keywords),
    hashtags: pickString(data.hashtags),
    targetAccounts: pickString(data.targetAccounts),
    excludedKeywords: pickString(data.excludedKeywords),
    language: pickString(data.language) || "ja",
    periodDays: pickNumber(data.periodDays, 7),
    minimumImpressions: pickNumber(data.minimumImpressions, 10000),
    minimumLikes: pickNumber(data.minimumLikes, 0),
    minimumReposts: pickNumber(data.minimumReposts, 0),
    fetchLimit: Math.min(Math.max(pickNumber(data.fetchLimit, 10), 1), 50),
    brand: pickString(data.brand) || "default",
    isActive: Boolean(data.isActive ?? true)
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const setting = validateSetting(body?.setting);

  if (!setting) {
    return NextResponse.json({ message: "検索条件を確認してください。" }, { status: 400 });
  }

  try {
    const provider = createXProvider();
    const candidates = await provider.fetchTrendingPosts({ setting });
    const strictPosts = candidates
      .filter((post) => {
        const passesImpressions =
          setting.minimumImpressions <= 0 ||
          (typeof post.impressionCount === "number" && post.impressionCount >= setting.minimumImpressions);
        return passesImpressions && post.likeCount >= setting.minimumLikes && post.repostCount >= setting.minimumReposts;
      })
      .slice(0, setting.fetchLimit);

    const message = strictPosts.length
      ? `${strictPosts.length}件のバズ投稿候補を取得しました。`
      : candidates.length
        ? `Xから${candidates.length}件見つかりましたが、最低表示数${setting.minimumImpressions.toLocaleString("ja-JP")}以上の投稿はありませんでした。キーワードを具体化するか、対象アカウントを入れて探してください。`
        : `Xから候補が見つかりませんでした。キーワードを減らすか、対象アカウントを入れてください。`;

    return NextResponse.json({
      posts: strictPosts,
      source: getXProviderStatus().mode,
      message,
      diagnostics: {
        candidateCount: candidates.length,
        strictCount: strictPosts.length,
        relaxed: false,
        minimumImpressions: setting.minimumImpressions,
        minimumLikes: setting.minimumLikes,
        minimumReposts: setting.minimumReposts
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message
            ? `X投稿の取得に失敗しました: ${error.message}`
            : "X投稿の取得に失敗しました。API設定または検索条件を確認してください。"
      },
      { status: 500 }
    );
  }
}
