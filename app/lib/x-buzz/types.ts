export type XSearchSetting = {
  id: string;
  name: string;
  keywords: string;
  hashtags: string;
  targetAccounts: string;
  excludedKeywords: string;
  language: string;
  periodDays: number;
  minimumImpressions: number;
  minimumEngagements: number;
  minimumLikes: number;
  minimumReposts: number;
  fetchLimit: number;
  brand: string;
  isActive: boolean;
};

export type XTrendingStatus =
  | "未確認"
  | "分析済み"
  | "投稿案作成済み"
  | "下書き保存済み"
  | "予約済み"
  | "投稿済み"
  | "見送り"
  | "非表示";

export type XTrendingPost = {
  id: string;
  xPostId: string;
  postUrl: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorFollowers?: number;
  postedAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  impressionCount?: number;
  buzzScore: number;
  engagementRate?: number;
  impressionEngagementRate?: number;
  hasMedia: boolean;
  fetchedAt: string;
  searchSettingId: string;
  rawData: Record<string, unknown>;
  status: XTrendingStatus;
  isFavorite: boolean;
  isHidden: boolean;
};

export type XPostAnalysis = {
  topic: string;
  viralReason: string;
  hookPattern: string;
  emotion: string;
  structure: string[];
  beginnerAngle: string;
  businessAngle: string;
  reliability: string;
  needsFactCheck: boolean;
  riskLevel: "low" | "medium" | "high";
  brandFitScore: number;
  originalValueIdeas: string[];
};

export type ThreadsDraftIdea = {
  type: "初心者向け" | "体験・意見" | "導線あり";
  opening: string;
  body: string;
  closing: string;
  cta: string;
  hashtags: string[];
  similarityRisk: "low" | "medium" | "high";
  similarityScore: number;
  needsFactCheck: boolean;
  originalInfoNeeded: string;
};

export type XBuzzAnalyzeResult = {
  analysis: XPostAnalysis;
  drafts: ThreadsDraftIdea[];
};
