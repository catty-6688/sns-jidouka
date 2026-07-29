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
    minimumLikes: pickNumber(data.minimumLikes, 500),
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
      .filter((post) => post.likeCount >= setting.minimumLikes && post.repostCount >= setting.minimumReposts)
      .slice(0, setting.fetchLimit);
    const relaxed = strictPosts.length === 0 && candidates.length > 0;
    const posts = relaxed ? candidates.slice(0, setting.fetchLimit) : strictPosts;

    const message = relaxed
      ? `Xから${candidates.length}件見つかりましたが、最低いいね${setting.minimumLikes}以上では0件でした。条件をゆるめた候補を表示します。`
      : posts.length
        ? `${posts.length}件の投稿候補を取得しました。`
        : `Xから候補が見つかりませんでした。キーワードを減らすか、取得件数を増やしてください。`;

    return NextResponse.json({
      posts,
      source: getXProviderStatus().mode,
      message,
      diagnostics: {
        candidateCount: candidates.length,
        strictCount: strictPosts.length,
        relaxed,
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
