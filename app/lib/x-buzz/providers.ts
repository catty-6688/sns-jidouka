import { calculateBuzzMetrics } from "./scoring";
import type { XSearchSetting, XTrendingPost } from "./types";

type XProviderFetchParams = {
  setting: XSearchSetting;
};

type XApiTweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    impression_count?: number;
    bookmark_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
};

type XApiUser = {
  id: string;
  name?: string;
  username?: string;
  public_metrics?: {
    followers_count?: number;
  };
};

type XApiSearchResponse = {
  data?: XApiTweet[];
  includes?: {
    users?: XApiUser[];
  };
  errors?: { detail?: string; title?: string }[];
};

export interface XPostProvider {
  fetchTrendingPosts(params: XProviderFetchParams): Promise<XTrendingPost[]>;
}

export function getXProviderStatus() {
  const provider = process.env.X_PROVIDER || "mock";
  const hasBearerToken = Boolean(process.env.X_BEARER_TOKEN);
  const isApiReady = provider === "api" && hasBearerToken;

  return {
    provider,
    mode: isApiReady ? "api" : "mock",
    hasBearerToken,
    isApiReady,
    message: isApiReady
      ? "X公式APIに接続する設定です。"
      : "まだモック取得です。Vercelの環境変数に X_PROVIDER=api と X_BEARER_TOKEN を設定すると本接続になります。"
  };
}

const mockPosts = [
  {
    text:
      "AIを使いこなす人って、特別なプロンプトを知ってる人じゃなくて、仕事を小さく分けるのがうまい人なんだと思う。",
    authorName: "AI仕事メモ",
    authorUsername: "ai_work_note",
    likeCount: 1840,
    repostCount: 312,
    replyCount: 86,
    quoteCount: 41,
    impressionCount: 214000,
    bookmarkCount: 520,
    authorFollowers: 23800,
    hasMedia: false
  },
  {
    text:
      "副業が続かない理由、根性不足じゃなくて『毎回ゼロから考えてる』からかも。型を作るだけでかなり楽になる。",
    authorName: "副業の整理術",
    authorUsername: "sidework_map",
    likeCount: 920,
    repostCount: 141,
    replyCount: 52,
    quoteCount: 28,
    impressionCount: 108000,
    bookmarkCount: 230,
    authorFollowers: 11200,
    hasMedia: false
  },
  {
    text:
      "ChatGPTに丸投げして微妙な文章になる人は、先に『誰に、何を感じてほしいか』を決めると一気に変わる。",
    authorName: "SNS改善ラボ",
    authorUsername: "sns_lab_jp",
    likeCount: 1370,
    repostCount: 228,
    replyCount: 73,
    quoteCount: 36,
    impressionCount: 166000,
    bookmarkCount: 410,
    authorFollowers: 18400,
    hasMedia: true
  },
  {
    text:
      "看護師の副業で最初に詰まるのは時間より発信テーマ。経験はあるのに、言葉にする場所で止まってる人が多い。",
    authorName: "ナース副業ノート",
    authorUsername: "nurse_side_note",
    likeCount: 640,
    repostCount: 88,
    replyCount: 39,
    quoteCount: 16,
    impressionCount: 76000,
    bookmarkCount: 170,
    authorFollowers: 8200,
    hasMedia: false
  },
  {
    text:
      "AIで時短するなら、文章を作らせる前に『迷っていることをリスト化』させるのが先。これだけで頭の渋滞が減る。",
    authorName: "AI時短の人",
    authorUsername: "ai_shortcut_jp",
    likeCount: 2180,
    repostCount: 404,
    replyCount: 109,
    quoteCount: 65,
    impressionCount: 298000,
    bookmarkCount: 760,
    authorFollowers: 35600,
    hasMedia: false
  }
];

export class MockXProvider implements XPostProvider {
  async fetchTrendingPosts({ setting }: XProviderFetchParams) {
    const now = new Date().toISOString();
    const keywords = splitLinesAndCommas(setting.keywords);
    const excluded = splitLinesAndCommas(setting.excludedKeywords);

    return mockPosts
      .filter((post) => {
        const matchesKeyword = !keywords.length || keywords.some((keyword) => post.text.includes(keyword));
        const matchesExclude = excluded.some((keyword) => post.text.includes(keyword));
        return matchesKeyword && !matchesExclude;
      })
      .map((post, index) => {
        const postedAt = new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000).toISOString();
        const metrics = calculateBuzzMetrics(post);
        const xPostId = `mock-${setting.id}-${index + 1}`;

        return {
          id: xPostId,
          xPostId,
          postUrl: `https://x.com/${post.authorUsername}/status/${100000 + index}`,
          text: post.text,
          authorName: post.authorName,
          authorUsername: post.authorUsername,
          authorFollowers: post.authorFollowers,
          postedAt,
          likeCount: post.likeCount,
          repostCount: post.repostCount,
          replyCount: post.replyCount,
          quoteCount: post.quoteCount,
          impressionCount: post.impressionCount,
          bookmarkCount: post.bookmarkCount,
          buzzScore: metrics.buzzScore,
          engagementRate: metrics.engagementRate,
          impressionEngagementRate: metrics.impressionEngagementRate,
          hasMedia: post.hasMedia,
          fetchedAt: now,
          searchSettingId: setting.id,
          rawData: post,
          status: "未確認" as const,
          isFavorite: false,
          isHidden: false
        };
      });
  }
}

export class XApiProvider implements XPostProvider {
  private readonly bearerToken: string;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  async fetchTrendingPosts({ setting }: XProviderFetchParams): Promise<XTrendingPost[]> {
    const query = buildXSearchQuery(setting);
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    const startTime = new Date(Date.now() - Math.min(Math.max(setting.periodDays, 1), 7) * 24 * 60 * 60 * 1000);
    const candidateLimit = Math.min(Math.max(setting.fetchLimit * 3, 30), 100);
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(candidateLimit));
    url.searchParams.set("sort_order", "relevancy");
    url.searchParams.set("start_time", startTime.toISOString());
    url.searchParams.set("tweet.fields", "created_at,public_metrics,attachments,author_id");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "name,username,public_metrics");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`
      },
      cache: "no-store"
    });

    const data = (await response.json().catch(() => null)) as XApiSearchResponse | null;

    if (!response.ok) {
      const message =
        data?.errors?.[0]?.detail ||
        data?.errors?.[0]?.title ||
        "X APIの認証、利用上限、または検索条件を確認してください。";
      throw new Error(message);
    }

    const users = new Map((data?.includes?.users || []).map((user) => [user.id, user]));
    const now = new Date().toISOString();

    return (data?.data || [])
      .map((tweet) => {
        const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
        const metrics = tweet.public_metrics || {};
        const postMetrics = {
          likeCount: metrics.like_count || 0,
          repostCount: metrics.retweet_count || 0,
          replyCount: metrics.reply_count || 0,
          quoteCount: metrics.quote_count || 0,
          impressionCount: metrics.impression_count,
          bookmarkCount: metrics.bookmark_count,
          authorFollowers: user?.public_metrics?.followers_count
        };
        const calculated = calculateBuzzMetrics(postMetrics);
        const username = user?.username || "unknown";

        return {
          id: tweet.id,
          xPostId: tweet.id,
          postUrl: `https://x.com/${username}/status/${tweet.id}`,
          text: tweet.text,
          authorName: user?.name || username,
          authorUsername: username,
          authorFollowers: postMetrics.authorFollowers,
          postedAt: tweet.created_at || now,
          likeCount: postMetrics.likeCount,
          repostCount: postMetrics.repostCount,
          replyCount: postMetrics.replyCount,
          quoteCount: postMetrics.quoteCount,
          impressionCount: postMetrics.impressionCount,
          bookmarkCount: postMetrics.bookmarkCount,
          buzzScore: calculated.buzzScore,
          engagementRate: calculated.engagementRate,
          impressionEngagementRate: calculated.impressionEngagementRate,
          hasMedia: Boolean(tweet.attachments?.media_keys?.length),
          fetchedAt: now,
          searchSettingId: setting.id,
          rawData: tweet as unknown as Record<string, unknown>,
          status: "未確認" as const,
          isFavorite: false,
          isHidden: false
        };
      })
      .sort((a, b) => b.buzzScore - a.buzzScore)
      .slice(0, candidateLimit);
  }
}

export function createXProvider(): XPostProvider {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (getXProviderStatus().isApiReady && bearerToken) {
    return new XApiProvider(bearerToken);
  }

  return new MockXProvider();
}

function buildXSearchQuery(setting: XSearchSetting) {
  const keywords = splitLinesAndCommas(setting.keywords);
  const hashtags = splitLinesAndCommas(setting.hashtags).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  const accounts = splitLinesAndCommas(setting.targetAccounts).map(normalizeXAccount).filter(Boolean).slice(0, 20).map((account) => `from:${account}`);
  const excluded = splitLinesAndCommas(setting.excludedKeywords).map((keyword) => `-"${keyword}"`);

  if (setting.searchMode === "benchmark" && accounts.length) {
    return [
      `(${accounts.join(" OR ")})`,
      setting.language ? `lang:${setting.language}` : "",
      "-is:retweet",
      ...excluded
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 512);
  }

  const positiveGroups = [...keywords, ...hashtags, ...accounts].filter(Boolean);
  const query = [
    positiveGroups.length ? `(${positiveGroups.join(" OR ")})` : "(AI OR ChatGPT OR SNS運用)",
    setting.language ? `lang:${setting.language}` : "",
    "-is:retweet",
    ...excluded
  ]
    .filter(Boolean)
    .join(" ");

  return query.slice(0, 512);
}

function splitLinesAndCommas(value: string) {
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeXAccount(account: string) {
  return account
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
}
