type ScoreInput = {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  bookmarkCount?: number;
  authorFollowers?: number;
  impressionCount?: number;
};

export const defaultBuzzWeights = {
  like: 1,
  repost: 3,
  reply: 2,
  quote: 3,
  bookmark: 4
};

export function calculateBuzzMetrics(input: ScoreInput) {
  const engagement = input.likeCount + input.repostCount + input.replyCount + input.quoteCount + (input.bookmarkCount || 0);
  const buzzScore =
    input.likeCount * defaultBuzzWeights.like +
    input.repostCount * defaultBuzzWeights.repost +
    input.replyCount * defaultBuzzWeights.reply +
    input.quoteCount * defaultBuzzWeights.quote +
    (input.bookmarkCount || 0) * defaultBuzzWeights.bookmark;

  return {
    buzzScore,
    engagementRate: input.authorFollowers ? roundRate((engagement / input.authorFollowers) * 100) : undefined,
    impressionEngagementRate: input.impressionCount
      ? roundRate((engagement / input.impressionCount) * 100)
      : undefined
  };
}

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}
