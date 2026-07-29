"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  ThreadsDraftIdea,
  XBuzzAnalyzeResult,
  XSearchSetting,
  XTrendingPost
} from "@/app/lib/x-buzz/types";

type Tone = "やさしい" | "煽り系" | "共感系" | "プロっぽい";
type Template = "basic" | "education" | "story";
type Mode = "single" | "weekly";
type AgentId = "research" | "buzz" | "account" | "planning" | "writing";
type View = "dashboard" | "profile" | "instant" | "analysis" | "buzz" | "calendar" | "history";
type XSortKey = "buzzScore" | "impressionCount" | "likeCount" | "repostCount" | "engagementRate" | "postedAt";
type XConnectionStatus = {
  provider: string;
  mode: "api" | "mock";
  hasBearerToken: boolean;
  isApiReady: boolean;
  message: string;
};

type GeneratedPost = {
  title: string;
  body: string;
};

type Checkpoint = {
  title: string;
  whatToCheck: string;
  decision: string;
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

type WeeklyDay = {
  day: string;
  theme: string;
  intent: string;
  posts: WeeklyPost[];
};

type GeneratedResult = {
  threads: GeneratedPost[];
  x: GeneratedPost[];
  checkpoints?: Checkpoint[];
  weekly?: WeeklyDay[];
};

type HistoryItem = {
  id: string;
  createdAt: string;
  mode: Mode;
  genre: string;
  target: string;
  pain: string;
  character: string;
  benchmarkAccounts: string;
  profileHistory: string;
  offer: string;
  personalExperiences: string;
  recentOwnPosts: string;
  researchNotes: string;
  tone: Tone;
  template: Template;
  result: GeneratedResult;
};

const storageKey = "sns-jidouka-history";
const agentStorageKey = "sns-jidouka-agent-outputs";
const profileStorageKey = "sns-jidouka-profile";
const threadsTokenStorageKey = "sns-jidouka-threads-token";
const threadsAuthStorageKey = "sns-jidouka-threads-auth";
const threadsPostStorageKey = "sns-jidouka-threads-posts";
const scheduleStorageKey = "sns-jidouka-schedule";
const scheduledPostStorageKey = "sns-jidouka-scheduled-posts";
const xSearchSettingsStorageKey = "sns-jidouka-x-search-settings";
const xTrendingPostsStorageKey = "sns-jidouka-x-trending-posts";
const xAnalysesStorageKey = "sns-jidouka-x-analyses";

const defaultXSearchSetting: XSearchSetting = {
  id: "default-ai",
  name: "AI・副業・SNS運用",
  keywords: "ChatGPT\nClaude\nAI副業\nSNS運用\n看護師副業",
  hashtags: "",
  targetAccounts: "",
  excludedKeywords: "簡単に稼げる\n誰でも月収\n確実に稼げる",
  language: "ja",
  periodDays: 7,
  minimumImpressions: 0,
  minimumEngagements: 20,
  minimumLikes: 0,
  minimumReposts: 0,
  fetchLimit: 15,
  brand: "キャティ",
  isActive: true
};

const defaultProfile = {
  genre: "AI × 美容 × 副業/SNS集客",
  target:
    "MLMの集客に疲れた人、副業をやってみたけどうまくいかない人、美容が好きな人、自分が何者か知りたい人",
  pain:
    "少しでも行動したけどうまくできない人に届ける。すぐ稼げると思っている人、何もやりたくない人、楽して稼ぎたい人は対象外。",
  character:
    "猫っぽい明るいミニキャラのキャティ。AI副業の相談室として、AIを使った発信、作業分解、SNS運用の小さなコツをやさしく伝える。最初から売り込まず、AIって便利そう、少し試してみたいと思ってもらう投稿を中心にする。副業で失敗した経験から、成功とは何かを見つけ、副業で6桁を達成した背景がある。口調は「です・ます」をベースに、自然な話し言葉も少し混ぜる。明るいけれど煽らない。現実はちゃんと言うけれど、突き放さず、一歩を踏み出せるように一緒に整理する相談相手。",
  benchmarkAccounts: "",
  profileHistory:
    "ここにChatGPTで作ったプロフィール・経歴・過去のストーリーをそのまま貼り付けてください。",
  offer:
    "無料相談への予約は毎回出さない。立ち上げ初期はAIの使い方、発信がラクになる考え方、作業分解、AIでできる小さな改善を中心にして信頼を作る。CTA投稿は週1〜2本だけ。学ぶのは無料だと伝える。エステレラ参加の話は大々的に言わず、無料相談で自然に話すためににおわせる程度にする。",
  personalExperiences:
    "AIを教えられるのが自分の強み。\nAIで投稿案、構成、キャプション、リサーチ、作業分解がラクになる体験を伝えたい。\n副業で失敗した経験があり、そこから成功とは何かを考えるようになった。\n副業で6桁を達成した経験がある。\n楽して稼ぎたい人より、少しでも行動している人を応援したい。\nMLM集客や副業で疲れている人に、AIを使って発信の負担を軽くする方法を伝えたい。\n美容が好きな人、学びながら自分の方向性を見つけたい人に合うと思っている。",
  recentOwnPosts:
    "ここに最近の自分のThreads投稿を5〜10本ほど貼ってください。AI社員と投稿生成が、言葉選び、改行、絵文字量、語尾、テンションを分析して寄せます。",
  researchNotes: ""
};

const agents: { id: AgentId; name: string; job: string }[] = [
  { id: "research", name: "リサーチ社員", job: "伸び投稿の材料を整理" },
  { id: "buzz", name: "バズ分析社員", job: "なぜ伸びたか分析" },
  { id: "account", name: "自アカ分析社員", job: "自分の勝ち筋を整理" },
  { id: "planning", name: "企画社員", job: "月4回運用の7日分テーマ作成" },
  { id: "writing", name: "投稿作成社員", job: "投稿案の指示作成" }
];

const tones: Tone[] = ["やさしい", "煽り系", "共感系", "プロっぽい"];

const templates: { id: Template; name: string; description: string }[] = [
  { id: "basic", name: "王道", description: "問題提起からCTAまで万能" },
  { id: "education", name: "教育", description: "ノウハウ投稿向き" },
  { id: "story", name: "ストーリー", description: "体験談向き" }
];

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [mode, setMode] = useState<Mode>("weekly");
  const [genre, setGenre] = useState(defaultProfile.genre);
  const [target, setTarget] = useState(defaultProfile.target);
  const [pain, setPain] = useState(defaultProfile.pain);
  const [character, setCharacter] = useState(defaultProfile.character);
  const [benchmarkAccounts, setBenchmarkAccounts] = useState(defaultProfile.benchmarkAccounts);
  const [profileHistory, setProfileHistory] = useState(defaultProfile.profileHistory);
  const [offer, setOffer] = useState(defaultProfile.offer);
  const [personalExperiences, setPersonalExperiences] = useState(defaultProfile.personalExperiences);
  const [recentOwnPosts, setRecentOwnPosts] = useState(defaultProfile.recentOwnPosts);
  const [researchNotes, setResearchNotes] = useState(defaultProfile.researchNotes);
  const [tone, setTone] = useState<Tone>("やさしい");
  const [template, setTemplate] = useState<Template>("basic");
  const [agentOutputs, setAgentOutputs] = useState<Partial<Record<AgentId, string>>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [threadsToken, setThreadsToken] = useState("");
  const [threadsStatus, setThreadsStatus] = useState("未接続");
  const [threadsAppId, setThreadsAppId] = useState("");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [threadsPublicUrl, setThreadsPublicUrl] = useState("");
  const [threadsAuthCode, setThreadsAuthCode] = useState("");
  const [threadsAuthStatus, setThreadsAuthStatus] = useState("");
  const [testPostText, setTestPostText] = useState("テスト投稿です。SNS投稿ツールからThreads連携を確認しています。");
  const [instantRawText, setInstantRawText] = useState("");
  const [instantPostText, setInstantPostText] = useState("");
  const [instantLoading, setInstantLoading] = useState(false);
  const [postedIds, setPostedIds] = useState<Record<string, string>>({});
  const [scheduledIds, setScheduledIds] = useState<Record<string, string>>({});
  const [scheduleStartDate, setScheduleStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [postTimes, setPostTimes] = useState(["08:00", "12:30", "20:00", ""]);
  const [bookingUrl, setBookingUrl] = useState("");
  const [xSearchSettings, setXSearchSettings] = useState<XSearchSetting[]>([defaultXSearchSetting]);
  const [activeXSearchId, setActiveXSearchId] = useState(defaultXSearchSetting.id);
  const [xTrendingPosts, setXTrendingPosts] = useState<XTrendingPost[]>([]);
  const [xAnalyses, setXAnalyses] = useState<Record<string, XBuzzAnalyzeResult>>({});
  const [xBuzzLoading, setXBuzzLoading] = useState(false);
  const [xAnalyzingId, setXAnalyzingId] = useState("");
  const [xBuzzError, setXBuzzError] = useState("");
  const [xConnectionStatus, setXConnectionStatus] = useState<XConnectionStatus | null>(null);
  const [xSortKey, setXSortKey] = useState<XSortKey>("buzzScore");
  const [xMinimumBuzz, setXMinimumBuzz] = useState(0);
  const [xOnlyFavorite, setXOnlyFavorite] = useState(false);
  const [xHideHidden, setXHideHidden] = useState(true);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [runningAgent, setRunningAgent] = useState<AgentId | "">("");
  const [loading, setLoading] = useState(false);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const isReady = useMemo(() => genre.trim() && target.trim() && pain.trim(), [genre, target, pain]);
  const activeXSearchSetting = useMemo(
    () => xSearchSettings.find((setting) => setting.id === activeXSearchId) || xSearchSettings[0] || defaultXSearchSetting,
    [activeXSearchId, xSearchSettings]
  );
  const visibleXTrendingPosts = useMemo(() => {
    return xTrendingPosts
      .filter((post) => (xHideHidden ? !post.isHidden : true))
      .filter((post) => (xOnlyFavorite ? post.isFavorite : true))
      .filter((post) => post.buzzScore >= xMinimumBuzz)
      .sort((a, b) => {
        if (xSortKey === "postedAt") return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        return (b[xSortKey] || 0) - (a[xSortKey] || 0);
      });
  }, [xHideHidden, xMinimumBuzz, xOnlyFavorite, xSortKey, xTrendingPosts]);

  useEffect(() => {
    if (!loading || !loadingStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - loadingStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading, loadingStartedAt]);

  useEffect(() => {
    const profile = window.localStorage.getItem(profileStorageKey);
    if (profile) {
      try {
        const saved = JSON.parse(profile) as Partial<typeof defaultProfile>;
        setGenre(saved.genre || defaultProfile.genre);
        setTarget(saved.target || defaultProfile.target);
        setPain(saved.pain || defaultProfile.pain);
        setCharacter(saved.character || defaultProfile.character);
        setBenchmarkAccounts(saved.benchmarkAccounts || defaultProfile.benchmarkAccounts);
        setProfileHistory(saved.profileHistory || defaultProfile.profileHistory);
        setOffer(saved.offer || defaultProfile.offer);
        setPersonalExperiences(saved.personalExperiences || defaultProfile.personalExperiences);
        setRecentOwnPosts(saved.recentOwnPosts || defaultProfile.recentOwnPosts);
        setResearchNotes(saved.researchNotes || defaultProfile.researchNotes);
      } catch {
        window.localStorage.removeItem(profileStorageKey);
      }
    }

    const agentsSaved = window.localStorage.getItem(agentStorageKey);
    if (agentsSaved) {
      try {
        setAgentOutputs(JSON.parse(agentsSaved) as Partial<Record<AgentId, string>>);
      } catch {
        window.localStorage.removeItem(agentStorageKey);
      }
    }

    const historySaved = window.localStorage.getItem(storageKey);
    if (historySaved) {
      try {
        setHistory(JSON.parse(historySaved) as HistoryItem[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    const savedThreadsToken = window.localStorage.getItem(threadsTokenStorageKey);
    if (savedThreadsToken) setThreadsToken(savedThreadsToken);

    const savedThreadsAuth = window.localStorage.getItem(threadsAuthStorageKey);
    if (savedThreadsAuth) {
      try {
        const auth = JSON.parse(savedThreadsAuth) as {
          appId?: string;
          appSecret?: string;
          publicUrl?: string;
        };
        setThreadsAppId(auth.appId || "");
        setThreadsAppSecret(auth.appSecret || "");
        setThreadsPublicUrl(auth.publicUrl || "");
      } catch {
        window.localStorage.removeItem(threadsAuthStorageKey);
      }
    }

    const savedPostedIds = window.localStorage.getItem(threadsPostStorageKey);
    if (savedPostedIds) {
      try {
        setPostedIds(JSON.parse(savedPostedIds) as Record<string, string>);
      } catch {
        window.localStorage.removeItem(threadsPostStorageKey);
      }
    }

    const savedScheduledIds = window.localStorage.getItem(scheduledPostStorageKey);
    if (savedScheduledIds) {
      try {
        setScheduledIds(JSON.parse(savedScheduledIds) as Record<string, string>);
      } catch {
        window.localStorage.removeItem(scheduledPostStorageKey);
      }
    }

    const savedSchedule = window.localStorage.getItem(scheduleStorageKey);
    if (savedSchedule) {
      try {
        const schedule = JSON.parse(savedSchedule) as {
          scheduleStartDate?: string;
          postTimes?: string[];
          bookingUrl?: string;
        };
        setScheduleStartDate(schedule.scheduleStartDate || new Date().toISOString().slice(0, 10));
        setPostTimes(schedule.postTimes?.length ? schedule.postTimes.slice(0, 4) : ["08:00", "12:30", "20:00", ""]);
        setBookingUrl(schedule.bookingUrl || "");
      } catch {
        window.localStorage.removeItem(scheduleStorageKey);
      }
    }

    const savedXSearchSettings = window.localStorage.getItem(xSearchSettingsStorageKey);
    if (savedXSearchSettings) {
      try {
        const parsed = JSON.parse(savedXSearchSettings) as XSearchSetting[];
        if (parsed.length) {
          const normalized = parsed.map((setting) => ({
            ...defaultXSearchSetting,
            ...setting,
            minimumImpressions: setting.minimumImpressions ?? defaultXSearchSetting.minimumImpressions,
            minimumEngagements: setting.minimumEngagements ?? defaultXSearchSetting.minimumEngagements,
            minimumLikes: setting.minimumLikes ?? defaultXSearchSetting.minimumLikes
          }));
          setXSearchSettings(normalized);
          setActiveXSearchId(normalized[0].id);
        }
      } catch {
        window.localStorage.removeItem(xSearchSettingsStorageKey);
      }
    }

    const savedXTrendingPosts = window.localStorage.getItem(xTrendingPostsStorageKey);
    if (savedXTrendingPosts) {
      try {
        setXTrendingPosts(JSON.parse(savedXTrendingPosts) as XTrendingPost[]);
      } catch {
        window.localStorage.removeItem(xTrendingPostsStorageKey);
      }
    }

    const savedXAnalyses = window.localStorage.getItem(xAnalysesStorageKey);
    if (savedXAnalyses) {
      try {
        setXAnalyses(JSON.parse(savedXAnalyses) as Record<string, XBuzzAnalyzeResult>);
      } catch {
        window.localStorage.removeItem(xAnalysesStorageKey);
      }
    }
  }, []);

  useEffect(() => {
    void refreshXConnectionStatus();
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }

  function markAction(id: string, message?: string) {
    setActionFeedback(id);
    if (message) flash(message);
    window.setTimeout(() => setActionFeedback(""), 1600);
  }

  function saveProfile() {
    window.localStorage.setItem(
      profileStorageKey,
      JSON.stringify({
        genre,
        target,
        pain,
        character,
        benchmarkAccounts,
        profileHistory,
        offer,
        personalExperiences,
        recentOwnPosts,
        researchNotes
      })
    );
    markAction("profile-save", "運用プロフィールを保存しました");
  }

  function resetProfile() {
    setGenre(defaultProfile.genre);
    setTarget(defaultProfile.target);
    setPain(defaultProfile.pain);
    setCharacter(defaultProfile.character);
    setBenchmarkAccounts(defaultProfile.benchmarkAccounts);
    setProfileHistory(defaultProfile.profileHistory);
    setOffer(defaultProfile.offer);
    setPersonalExperiences(defaultProfile.personalExperiences);
    setRecentOwnPosts(defaultProfile.recentOwnPosts);
    setResearchNotes(defaultProfile.researchNotes);
    window.localStorage.removeItem(profileStorageKey);
    markAction("profile-reset", "初期設定に戻しました");
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    flash("コピーしました");
    window.setTimeout(() => setCopiedId(""), 1400);
  }

  function saveThreadsToken() {
    window.localStorage.setItem(threadsTokenStorageKey, threadsToken.trim());
    markAction("threads-token-save", "Threadsトークンを保存しました");
  }

  function clearThreadsToken() {
    setThreadsToken("");
    setThreadsStatus("未接続");
    window.localStorage.removeItem(threadsTokenStorageKey);
    markAction("threads-token-clear", "Threadsトークンを消しました");
  }

  function getThreadsRedirectUri() {
    const baseUrl = threadsPublicUrl.trim().replace(/\/$/, "");
    return baseUrl ? `${baseUrl}/api/threads/callback` : "";
  }

  function getThreadsAuthorizeUrl() {
    const redirectUri = getThreadsRedirectUri();
    if (!threadsAppId.trim() || !redirectUri) return "";

    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", threadsAppId.trim());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "threads_basic,threads_content_publish");
    url.searchParams.set("response_type", "code");
    return url.toString();
  }

  function saveThreadsAuthSettings() {
    window.localStorage.setItem(
      threadsAuthStorageKey,
      JSON.stringify({
        appId: threadsAppId.trim(),
        appSecret: threadsAppSecret.trim(),
        publicUrl: threadsPublicUrl.trim()
      })
    );
    markAction("threads-auth-save", "Threads認証設定を保存しました");
  }

  async function copyThreadsText(id: string, text: string) {
    if (!text) {
      setThreadsAuthStatus("コピーする内容がありません");
      return;
    }
    await copyText(id, text);
  }

  async function exchangeThreadsCode() {
    const redirectUri = getThreadsRedirectUri();

    if (!threadsAppId.trim() || !threadsAppSecret.trim() || !threadsAuthCode.trim() || !redirectUri) {
      setThreadsAuthStatus("App ID、App Secret、ngrok URL、codeをすべて入力してください。");
      return;
    }

    setThreadsAuthStatus("アクセストークンを取得中...");

    try {
      const response = await fetch("/api/threads/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: threadsAppId.trim(),
          appSecret: threadsAppSecret.trim(),
          code: threadsAuthCode.trim(),
          redirectUri
        })
      });
      const data = await response.json();

      if (!response.ok || !data.accessToken) throw new Error(data.message || "アクセストークン取得に失敗しました。");

      setThreadsToken(data.accessToken);
      window.localStorage.setItem(threadsTokenStorageKey, data.accessToken);
      setThreadsAuthStatus(
        `${data.tokenType === "long_lived" ? "長期" : "短期"}アクセストークンを取得して保存しました。`
      );
      setThreadsAuthCode("");
      markAction("threads-token-save", "Threadsトークンを保存しました");
    } catch (caught) {
      setThreadsAuthStatus(caught instanceof Error ? caught.message : "アクセストークン取得でエラーが発生しました。");
    }
  }

  function saveSchedule() {
    window.localStorage.setItem(
      scheduleStorageKey,
      JSON.stringify({ scheduleStartDate, postTimes, bookingUrl })
    );
    markAction("schedule-save", "投稿作成設定を保存しました");
  }

  function addToSchedule(id: string, label: string) {
    const next = { ...scheduledIds };
    if (next[id]) {
      delete next[id];
      setScheduledIds(next);
      window.localStorage.setItem(scheduledPostStorageKey, JSON.stringify(next));
      markAction(`schedule-${id}`, "予約済みチェックを外しました");
      return;
    }

    next[id] = label;
    setScheduledIds(next);
    window.localStorage.setItem(scheduledPostStorageKey, JSON.stringify(next));
    markAction(`schedule-${id}`, "Threadsで予約済みにしました");
  }

  function addManyToSchedule(items: { id: string; label: string }[]) {
    const targets = items.filter((item) => !scheduledIds[item.id]);
    if (!targets.length) {
      flash("まだチェックできる投稿がありません");
      return;
    }

    const next = { ...scheduledIds };
    targets.forEach((item) => {
      next[item.id] = item.label;
    });
    setScheduledIds(next);
    window.localStorage.setItem(scheduledPostStorageKey, JSON.stringify(next));
    markAction("schedule-all", `${targets.length}件を予約済みにしました`);
  }

  function updatePostTime(index: number, value: string) {
    setPostTimes((current) => current.map((time, timeIndex) => (timeIndex === index ? value : time)));
  }

  function saveXSearchSettings(settings = xSearchSettings) {
    window.localStorage.setItem(xSearchSettingsStorageKey, JSON.stringify(settings));
    markAction("x-search-save", "バズネタ検索条件を保存しました");
  }

  function updateActiveXSearchSetting<K extends keyof XSearchSetting>(key: K, value: XSearchSetting[K]) {
    setXSearchSettings((current) => {
      const next = current.map((setting) =>
        setting.id === activeXSearchSetting.id ? { ...setting, [key]: value } : setting
      );
      window.localStorage.setItem(xSearchSettingsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function addXSearchSetting() {
    const setting: XSearchSetting = {
      ...defaultXSearchSetting,
      id: `setting-${Date.now()}`,
      name: `検索条件 ${xSearchSettings.length + 1}`,
      keywords: "",
      hashtags: "",
      targetAccounts: "",
      excludedKeywords: ""
    };
    const next = [...xSearchSettings, setting];
    setXSearchSettings(next);
    setActiveXSearchId(setting.id);
    window.localStorage.setItem(xSearchSettingsStorageKey, JSON.stringify(next));
    flash("検索条件を追加しました");
  }

  async function refreshXConnectionStatus() {
    try {
      const response = await fetch("/api/x-buzz/status", { cache: "no-store" });
      const data = (await response.json()) as XConnectionStatus;
      if (response.ok) setXConnectionStatus(data);
    } catch {
      setXConnectionStatus(null);
    }
  }

  async function fetchXTrendingPosts() {
    setXBuzzLoading(true);
    setXBuzzError("");

    try {
      const response = await fetch("/api/x-buzz/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting: activeXSearchSetting })
      });
      const data = (await response.json()) as {
        posts?: XTrendingPost[];
        message?: string;
        source?: "api" | "mock";
        diagnostics?: { relaxed?: boolean; candidateCount?: number; strictCount?: number };
      };
      if (!response.ok || !data.posts) throw new Error(data.message || "X投稿を取得できませんでした。");

      const merged = mergeXPosts(xTrendingPosts, data.posts);
      setXTrendingPosts(merged);
      window.localStorage.setItem(xTrendingPostsStorageKey, JSON.stringify(merged));
      markAction(
        "x-fetch",
        `${data.message || `${data.posts.length}件の投稿候補を取得しました`}（${data.source === "api" ? "X API" : "テストデータ"}）`
      );
      void refreshXConnectionStatus();
    } catch (caught) {
      setXBuzzError(caught instanceof Error ? caught.message : "X投稿の取得に失敗しました。");
    } finally {
      setXBuzzLoading(false);
    }
  }

  async function analyzeXTrendingPost(post: XTrendingPost) {
    setXAnalyzingId(post.id);
    setXBuzzError("");

    try {
      const response = await fetch("/api/x-buzz/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post,
          profile: {
            genre,
            target,
            tone,
            character,
            offer,
            personalExperiences,
            recentOwnPosts
          }
        })
      });
      const data = (await response.json()) as XBuzzAnalyzeResult & { message?: string };
      if (!response.ok || !data.analysis || !data.drafts) {
        throw new Error(data.message || "AI分析に失敗しました。");
      }

      const nextAnalyses = { ...xAnalyses, [post.id]: { analysis: data.analysis, drafts: data.drafts } };
      setXAnalyses(nextAnalyses);
      window.localStorage.setItem(xAnalysesStorageKey, JSON.stringify(nextAnalyses));
      updateXPost(post.id, { status: "投稿案作成済み" });
      markAction(`x-analyze-${post.id}`, "AI分析とThreads案を作成しました");
    } catch (caught) {
      setXBuzzError(caught instanceof Error ? caught.message : "AI分析に失敗しました。");
    } finally {
      setXAnalyzingId("");
    }
  }

  function updateXPost(id: string, patch: Partial<XTrendingPost>) {
    setXTrendingPosts((current) => {
      const next = current.map((post) => (post.id === id ? { ...post, ...patch } : post));
      window.localStorage.setItem(xTrendingPostsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function updateXDraft(postId: string, draftIndex: number, patch: Partial<ThreadsDraftIdea>) {
    setXAnalyses((current) => {
      const currentAnalysis = current[postId];
      if (!currentAnalysis) return current;

      const next = {
        ...current,
        [postId]: {
          ...currentAnalysis,
          drafts: currentAnalysis.drafts.map((draft, index) =>
            index === draftIndex ? { ...draft, ...patch } : draft
          )
        }
      };
      window.localStorage.setItem(xAnalysesStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function sendBuzzDraftToCalendar(post: XTrendingPost, draft: ThreadsDraftIdea) {
    if (draft.similarityRisk === "high" || draft.similarityScore >= 65) {
      const ok = window.confirm(
        "元投稿との表現が近すぎる可能性があります。独自の体験や意見を追加してから送りますか？"
      );
      if (!ok) return;
    }

    const body = [draft.opening, draft.body, draft.closing]
      .filter(Boolean)
      .join("\n\n");

    setResult({
      threads: [{ title: `${draft.type}: ${post.authorUsername}`, body }],
      x: [],
      checkpoints: [
        {
          title: "元投稿の確認",
          whatToCheck: `元ネタURL: ${post.postUrl}`,
          decision: "表現を写していないか確認する"
        },
        {
          title: "ファクトチェック",
          whatToCheck: draft.needsFactCheck ? "事実確認が必要です" : "事実確認リスクは低めです",
          decision: "必要なら公式情報を確認してから予約する"
        }
      ],
      weekly: [
        {
          day: "バズネタ",
          theme: "Xバズ投稿からThreads案",
          intent: "元投稿の型だけを参考にして自分の言葉で投稿する",
          posts: [
            {
              title: `${draft.type}案`,
              body,
              cta: draft.cta,
              experienceUsed: draft.originalInfoNeeded || "独自体験を必要に応じて追加",
              referencePattern: `元ネタ: ${post.postUrl}`,
              score: {
                novelty: "元投稿の話題を、自アカウント向けに切り替え",
                personality: "体験や意見を追加して調整",
                expertise: "AI活用/SNS運用の視点で補強",
                curiosity: draft.opening
              }
            }
          ]
        }
      ]
    });
    updateXPost(post.id, { status: "下書き保存済み" });
    setView("calendar");
    flash("既存の投稿カレンダーへ下書きを送りました");
  }

  function updateWeeklyPostTitle(dayIndex: number, postIndex: number, title: string) {
    setResult((current) => {
      if (!current?.weekly) return current;

      return {
        ...current,
        weekly: current.weekly.map((day, currentDayIndex) =>
          currentDayIndex === dayIndex
            ? {
                ...day,
                posts: day.posts.map((post, currentPostIndex) =>
                  currentPostIndex === postIndex ? { ...post, title } : post
                )
              }
            : day
        )
      };
    });
  }

  function updateWeeklyPostBody(dayIndex: number, postIndex: number, body: string) {
    setResult((current) => {
      if (!current?.weekly) return current;

      return {
        ...current,
        weekly: current.weekly.map((day, currentDayIndex) =>
          currentDayIndex === dayIndex
            ? {
                ...day,
                posts: day.posts.map((post, currentPostIndex) =>
                  currentPostIndex === postIndex ? { ...post, body } : post
                )
              }
            : day
        )
      };
    });
  }

  function buildCalendarText() {
    if (!result?.weekly?.length) return "";

    return result.weekly
      .flatMap((day, dayIndex) =>
        day.posts.map((post, postIndex) => {
          const date = addDays(scheduleStartDate, dayIndex);
          const time = postTimes[postIndex] || "";
          return [
            date,
            time,
            day.day,
            day.theme,
            post.title,
            post.body.replace(/\r?\n/g, "\\n"),
          ].join("\t");
        })
      )
      .join("\n");
  }

  function buildReminderText() {
    if (!scheduleStartDate) return "";
    const reminderDate = addDays(scheduleStartDate, -14);
    return [
      "件名\t日付\t内容",
      [
        "SNS投稿予約を入れる",
        reminderDate,
        `投稿開始日 ${scheduleStartDate} の2週間前です。7日分の投稿を確認し、Threads側で予約投稿を登録してください。`
      ].join("\t")
    ].join("\n");
  }

  async function checkThreadsConnection() {
    setThreadsStatus("確認中...");

    try {
      const response = await fetch("/api/threads/status", {
        headers: threadsToken.trim() ? { "x-threads-token": threadsToken.trim() } : {}
      });
      const data = await response.json();

      if (data.connected) {
        const name = data.account?.username || data.account?.name || data.account?.id || "Threads";
        setThreadsStatus(`接続OK: ${name}`);
      } else {
        setThreadsStatus(data.message || "未接続");
      }
    } catch {
      setThreadsStatus("接続確認に失敗しました");
    }
  }

  async function publishToThreads(id: string, text: string) {
    if (!window.confirm("予約ではありません。\nこの投稿は今すぐThreadsに投稿されます。よろしいですか？")) return;

    try {
      const response = await fetch("/api/threads/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(threadsToken.trim() ? { "x-threads-token": threadsToken.trim() } : {})
        },
        body: JSON.stringify({ text })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Threads投稿に失敗しました。");

      const next = { ...postedIds, [id]: data.id || "posted" };
      setPostedIds(next);
      window.localStorage.setItem(threadsPostStorageKey, JSON.stringify(next));
      flash("Threadsに投稿しました");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Threads投稿でエラーが発生しました。");
    }
  }

  async function publishTestPost() {
    await publishToThreads(`test-${Date.now()}`, testPostText);
  }

  async function polishInstantPost() {
    if (!instantRawText.trim()) {
      setError("整えたい言葉を入力してください。");
      return;
    }

    setError("");
    setInstantLoading(true);

    try {
      const response = await fetch("/api/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: instantRawText,
          character,
          profileHistory,
          personalExperiences,
          recentOwnPosts,
          tone
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "今すぐ投稿の整形に失敗しました。");

      setInstantPostText(data.text || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "今すぐ投稿の整形でエラーが発生しました。");
    } finally {
      setInstantLoading(false);
    }
  }

  async function publishManyToThreads(items: { id: string; text: string }[]) {
    const targets = items.filter((item) => !postedIds[item.id] && item.text.trim());
    if (!targets.length) {
      flash("投稿できる未投稿の文章がありません");
      return;
    }

    const ok = window.confirm(
      `${targets.length}件の未投稿をThreadsへまとめて投稿します。\n予約ではなく、今すぐ投稿されます。よろしいですか？`
    );
    if (!ok) return;

    setError("");
    const nextPostedIds = { ...postedIds };
    let successCount = 0;

    try {
      for (const item of targets) {
        const response = await fetch("/api/threads/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(threadsToken.trim() ? { "x-threads-token": threadsToken.trim() } : {})
          },
          body: JSON.stringify({ text: item.text })
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Threads投稿に失敗しました。");

        nextPostedIds[item.id] = data.id || "posted";
        successCount += 1;
      }

      setPostedIds(nextPostedIds);
      window.localStorage.setItem(threadsPostStorageKey, JSON.stringify(nextPostedIds));
      flash(`${successCount}件をThreadsに投稿しました`);
    } catch (caught) {
      setPostedIds(nextPostedIds);
      window.localStorage.setItem(threadsPostStorageKey, JSON.stringify(nextPostedIds));
      const message = caught instanceof Error ? caught.message : "まとめ投稿でエラーが発生しました。";
      setError(`${successCount}件投稿後に停止しました。${message}`);
    }
  }

  async function runAgent(agentId: AgentId) {
    setAgentError("");
    setRunningAgent(agentId);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
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
          agentOutputs
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "AI社員の作業に失敗しました。");

      const next = { ...agentOutputs, [agentId]: data.output };
      setAgentOutputs(next);
      window.localStorage.setItem(agentStorageKey, JSON.stringify(next));
      flash(`${data.label || "AI社員"}の作業が完了しました`);
    } catch (caught) {
      setAgentError(caught instanceof Error ? caught.message : "AI社員の作業でエラーが発生しました。");
    } finally {
      setRunningAgent("");
    }
  }

  function applyAgentOutputs() {
    const text = agents
      .map((agent) => (agentOutputs[agent.id] ? `# ${agent.name}\n${agentOutputs[agent.id]}` : ""))
      .filter(Boolean)
      .join("\n\n");

    if (!text) return;

    setResearchNotes((current) => [current, text].filter(Boolean).join("\n\n"));
    flash("AI社員メモをリサーチ欄に反映しました");
  }

  function clearAgentOutputs() {
    setAgentOutputs({});
    window.localStorage.removeItem(agentStorageKey);
    flash("AI社員メモを消しました");
  }

  function saveHistory(item: HistoryItem) {
    const next = [item, ...history].slice(0, 10);
    setHistory(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isReady) {
      setError("基本プロフィールのジャンル、ターゲット、悩みを確認してください。");
      return;
    }

    setLoading(true);
    setLoadingStartedAt(Date.now());

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 150000);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
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
        })
      });
      window.clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "投稿生成に失敗しました。");

      setResult(data);
      saveHistory({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
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
        template,
        result: data
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("投稿生成が長すぎたため停止しました。入力欄が長い場合は少し短くして、もう一度試してください。");
      } else {
        setError(caught instanceof Error ? caught.message : "エラーが発生しました。");
      }
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }

  function loadHistory(item: HistoryItem) {
    setMode(item.mode || "weekly");
    setGenre(item.genre);
    setTarget(item.target);
    setPain(item.pain);
    setCharacter(item.character || defaultProfile.character);
    setBenchmarkAccounts(item.benchmarkAccounts || defaultProfile.benchmarkAccounts);
    setProfileHistory(item.profileHistory || defaultProfile.profileHistory);
    setOffer(item.offer);
    setPersonalExperiences(item.personalExperiences);
    setRecentOwnPosts(item.recentOwnPosts || defaultProfile.recentOwnPosts);
    setResearchNotes(item.researchNotes);
    setTone(item.tone);
    setTemplate(item.template);
    setResult(item.result);
  }

  const navItems: { id: View; label: string; shortLabel: string }[] = [
    { id: "dashboard", label: "ダッシュボード", shortLabel: "ホーム" },
    { id: "profile", label: "素材設定", shortLabel: "素材" },
    { id: "instant", label: "今すぐ投稿", shortLabel: "今すぐ" },
    { id: "analysis", label: "AI分析", shortLabel: "分析" },
    { id: "buzz", label: "バズネタ収集", shortLabel: "バズ" },
    { id: "calendar", label: "投稿カレンダー", shortLabel: "予約" },
    { id: "history", label: "履歴", shortLabel: "履歴" }
  ];

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-4 text-slate-950 sm:px-4 sm:py-6">
      <header className="mb-4 border-b border-slate-200 pb-4 sm:mb-6">
        <p className="text-sm font-bold text-pink-600">SNS投稿半自動化ツール</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Threads運用ダッシュボード</h1>
        <p className="mt-2 text-sm text-slate-600">月4回だけ確認。1回で7日分を作り、修正したら予約・投稿するだけにします。</p>
      </header>

      <nav className="mb-6 hidden gap-2 sm:grid sm:grid-cols-7">
        {navItems.map((item) => (
          <NavButton key={item.id} active={view === item.id} onClick={() => setView(item.id)}>
            {item.label}
          </NavButton>
        ))}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-[#0a000c]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 backdrop-blur sm:hidden">
        <div className="grid grid-cols-7 gap-1">
          {navItems.map((item) => (
            <MobileNavButton key={item.id} active={view === item.id} onClick={() => setView(item.id)}>
              {item.shortLabel}
            </MobileNavButton>
          ))}
        </div>
      </nav>

      {notice ? (
        <div className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-md rounded-lg border border-pink-200 bg-pink-600 px-4 py-3 text-center text-sm font-bold text-white shadow-xl sm:left-auto sm:right-6 sm:top-6">
          {notice}
        </div>
      ) : null}

      {view === "dashboard" ? (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold">今日やること</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <button type="button" onClick={() => setView("profile")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">1. 素材を確認</p>
              <p className="mt-1 text-sm text-slate-600">プロフィール、経歴、ベンチマークを入れる</p>
            </button>
            <button type="button" onClick={() => setView("analysis")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">2. AI社員に分析</p>
              <p className="mt-1 text-sm text-slate-600">リサーチ、バズ分析、企画を作る</p>
            </button>
            <button type="button" onClick={() => setView("buzz")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">3. バズネタ収集</p>
              <p className="mt-1 text-sm text-slate-600">Xの伸び投稿からThreads案を作る</p>
            </button>
            <button type="button" onClick={() => setView("calendar")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">4. 投稿生成と予約</p>
              <p className="mt-1 text-sm text-slate-600">7日分を月間カレンダーで確認</p>
            </button>
            <button type="button" onClick={() => setView("history")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">5. 履歴を見る</p>
              <p className="mt-1 text-sm text-slate-600">過去の生成結果を読み込む</p>
            </button>
          </div>
          <div className="mt-4 rounded-md bg-pink-50 p-4">
            <p className="font-bold">現在の状態</p>
            <p className="mt-1 text-sm text-slate-600">Threads: {threadsStatus} / 投稿開始日: {scheduleStartDate}</p>
          </div>
        </section>
      ) : null}

      {view === "profile" ? (
      <>
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">0. Threads連携</h2>
        <p className="mt-1 text-sm text-slate-600">
          Threads側で連携したあと、発行されたアクセストークンだけここに貼ればOKです。
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            type="password"
            value={threadsToken}
            onChange={(event) => setThreadsToken(event.target.value)}
            placeholder="Threadsアクセストークンを貼り付け"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveThreadsToken}
              className={`rounded-md px-4 py-2 text-sm font-bold text-white transition ${
                actionFeedback === "threads-token-save" ? "bg-green-500" : "bg-pink-600 active:scale-[0.98]"
              }`}
            >
              {actionFeedback === "threads-token-save" ? "保存済み" : "保存"}
            </button>
            <button type="button" onClick={checkThreadsConnection} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              接続確認
            </button>
            <button
              type="button"
              onClick={clearThreadsToken}
              className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                actionFeedback === "threads-token-clear" ? "bg-green-500 text-white" : ""
              }`}
            >
              {actionFeedback === "threads-token-clear" ? "消しました" : "消す"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold">状態: {threadsStatus}</p>
        <details className="mt-4 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
          <summary className="cursor-pointer font-bold text-slate-950">開発者向け: トークンを自分で作る場合だけ開く</summary>
          <p className="mt-2">
            通常はここを使わなくて大丈夫です。Meta側で連携を済ませたトークンを上に貼るだけで進めます。
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Input label="Threads App ID" value={threadsAppId} onChange={setThreadsAppId} />
            <Input label="Threads App Secret" value={threadsAppSecret} onChange={setThreadsAppSecret} />
            <Input
              label="ngrokなどの公開URL"
              value={threadsPublicUrl}
              onChange={setThreadsPublicUrl}
            />
            <div>
              <label className="text-sm font-bold">Metaに入れるコールバックURL</label>
              <input
                value={getThreadsRedirectUri()}
                readOnly
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveThreadsAuthSettings}
              className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                actionFeedback === "threads-auth-save" ? "bg-green-500 text-white" : ""
              }`}
            >
              {actionFeedback === "threads-auth-save" ? "保存済み" : "認証設定を保存"}
            </button>
            <button
              type="button"
              onClick={() => copyThreadsText("threads-callback", getThreadsRedirectUri())}
              disabled={!getThreadsRedirectUri()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-45"
            >
              コールバックURLをコピー
            </button>
            <button
              type="button"
              onClick={() => copyThreadsText("threads-auth-url", getThreadsAuthorizeUrl())}
              disabled={!getThreadsAuthorizeUrl()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-45"
            >
              認可URLをコピー
            </button>
            <button
              type="button"
              onClick={() => window.open(getThreadsAuthorizeUrl(), "_blank", "noopener,noreferrer")}
              disabled={!getThreadsAuthorizeUrl()}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              認可画面を開く
            </button>
          </div>
          <label className="mt-4 block text-sm font-bold">
            戻ってきたcode
            <textarea
              value={threadsAuthCode}
              onChange={(event) => setThreadsAuthCode(event.target.value)}
              rows={3}
              placeholder="認可後に /api/threads/callback 画面へ表示されたcodeを貼り付け"
              className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={exchangeThreadsCode}
            className="mt-3 rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white"
          >
            codeからアクセストークンを取得
          </button>
          {threadsAuthStatus ? <p className="mt-2 text-sm font-bold text-slate-600">{threadsAuthStatus}</p> : null}
        </details>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-bold">テスト投稿</h3>
              <p className="mt-1 text-sm text-slate-600">
                接続OKになったら、まずこの短い文だけで投稿テストします。
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">{testPostText.length}/500文字</span>
          </div>
          <textarea
            value={testPostText}
            onChange={(event) => setTestPostText(event.target.value)}
            rows={3}
            className="mt-3 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={publishTestPost}
            disabled={!testPostText.trim() || testPostText.length > 500}
            className="mt-3 rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
          >
            この文でThreadsにテスト投稿
          </button>
          <p className="mt-2 text-xs text-slate-500">
            押すと実際のThreadsアカウントに投稿されます。非公開テストではありません。
          </p>
        </div>
        <details className="mt-3 text-sm text-slate-600">
          <summary className="cursor-pointer font-bold">トークン取得に必要なもの</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Meta for DevelopersのThreadsアプリ</li>
            <li>権限: threads_basic, threads_content_publish</li>
            <li>投稿後分析までやるなら threads_manage_insights</li>
            <li>取得したThreads User Access Tokenを上に貼り付け</li>
          </ul>
        </details>
      </section>
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">1. 素材とキャラクター</h2>
            <p className="mt-1 text-sm text-slate-600">普段はここだけ確認すればOKです。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveProfile}
              className={`rounded-md px-4 py-2 text-sm font-bold text-white transition ${
                actionFeedback === "profile-save" ? "bg-green-500" : "bg-pink-600 active:scale-[0.98]"
              }`}
            >
              {actionFeedback === "profile-save" ? "保存済み" : "保存"}
            </button>
            <button
              type="button"
              onClick={resetProfile}
              className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                actionFeedback === "profile-reset" ? "bg-green-500 text-white" : ""
              }`}
            >
              {actionFeedback === "profile-reset" ? "戻しました" : "初期設定に戻す"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-pink-200 bg-pink-50 p-3">
          <TextArea
            label="導線ルール（無料相談は控えめ）"
            value={offer}
            onChange={setOffer}
            rows={5}
            help="ここが無料相談に誘導する頻度と温度感の設定です。通常投稿では誘導せず、CTA投稿だけ週1〜2本まで自然に使います。"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextArea label="投稿キャラクター・個性" value={character} onChange={setCharacter} rows={5} />
          <TextArea
            label="プロフィール・経歴コピペ欄"
            value={profileHistory}
            onChange={setProfileHistory}
            rows={10}
            help="ChatGPTで作った経歴文をそのまま貼ってOKです。AI社員と投稿生成がここを読んで、あなたらしい投稿に反映します。"
          />
          <TextArea
            label="ベンチマークアカウント 最大3つ"
            value={benchmarkAccounts}
            onChange={setBenchmarkAccounts}
            rows={5}
            help="@IDやURLを1行に1つ。AI社員はここを参考に、言葉ではなく型だけを抽出します。"
          />
          <TextArea label="使える実体験・思想メモ" value={personalExperiences} onChange={setPersonalExperiences} rows={5} />
          <TextArea
            label="最近の自分の投稿コピペ欄"
            value={recentOwnPosts}
            onChange={setRecentOwnPosts}
            rows={8}
            help="自分のThreads投稿を5〜10本貼ると、AI社員が言葉選び・改行・絵文字量・語尾を分析して、あなたっぽさを投稿生成に反映します。"
          />
          <TextArea
            label="直近リサーチ・参考投稿メモ"
            value={researchNotes}
            onChange={setResearchNotes}
            rows={4}
            help="AI社員メモは「投稿生成に反映」を押すとここに入ります。投稿生成はこの欄を読みます。"
          />
        </div>

        <details className="mt-4 rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer font-bold">基本プロフィールと詳細設定</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Input label="投稿ジャンル" value={genre} onChange={setGenre} />
            <Input label="ターゲット" value={target} onChange={setTarget} />
            <TextArea label="悩み・対象外にしたい人" value={pain} onChange={setPain} rows={4} />
            <div>
              <p className="text-sm font-bold">作成モード</p>
              <div className="mt-2 flex gap-2">
                <Choice active={mode === "weekly"} onClick={() => setMode("weekly")}>1週間分</Choice>
                <Choice active={mode === "single"} onClick={() => setMode("single")}>単発</Choice>
              </div>
              <p className="mt-4 text-sm font-bold">投稿トーン</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tones.map((item) => (
                  <Choice key={item} active={tone === item} onClick={() => setTone(item)}>{item}</Choice>
                ))}
              </div>
              <p className="mt-4 text-sm font-bold">テンプレ</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {templates.map((item) => (
                  <Choice key={item.id} active={template === item.id} onClick={() => setTemplate(item.id)}>
                    {item.name}
                  </Choice>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>
      </>
      ) : null}

      {view === "instant" ? (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">今すぐ投稿</h2>
              <p className="mt-1 text-sm text-slate-600">
                急に投稿したくなった言葉を、キャティの口調に整えます。実績も少しだけ自然に混ぜます。
              </p>
            </div>
            <p className="text-xs font-bold text-slate-500">{instantPostText.length}/500文字</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-bold">
              入れたい言葉・メモ
              <textarea
                value={instantRawText}
                onChange={(event) => setInstantRawText(event.target.value)}
                rows={9}
                placeholder="例: 副業って頑張ってるのに結果が出ないとしんどい。でもAIで作業を分解したら少しラクになった、みたいなことを投稿したい"
                className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-bold">
              整えた投稿文
              <textarea
                value={instantPostText}
                onChange={(event) => setInstantPostText(event.target.value)}
                rows={9}
                placeholder="ここに整えた投稿文が入ります。投稿前に自由に修正できます。"
                className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={polishInstantPost}
              disabled={instantLoading || !instantRawText.trim()}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              {instantLoading ? "整えています..." : "投稿文を整える"}
            </button>
            <button
              type="button"
              onClick={() => copyText("instant-post", instantPostText)}
              disabled={!instantPostText.trim()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-45"
            >
              {copiedId === "instant-post" ? "コピーしました" : "コピー"}
            </button>
            <button
              type="button"
              onClick={() => publishToThreads(`instant-${Date.now()}`, instantPostText)}
              disabled={!instantPostText.trim() || instantPostText.length > 500}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              今すぐThreadsに投稿
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            投稿ボタンは実際のThreadsアカウントに投稿します。予約ではありません。
          </p>
        </section>
      ) : null}

      {view === "analysis" ? (
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">2. AI社員</h2>
            <p className="mt-1 text-sm text-slate-600">左から順番に押します。終わったら「投稿生成に反映」を押します。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyAgentOutputs}
              disabled={!Object.values(agentOutputs).some(Boolean)}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              投稿生成に反映
            </button>
            <button type="button" onClick={clearAgentOutputs} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              社員メモを消す
            </button>
          </div>
        </div>

        {agentError ? <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{agentError}</p> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {agents.map((agent, index) => {
            const output = agentOutputs[agent.id] || "";
            return (
              <div key={agent.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-500">{index + 1}人目</p>
                <h3 className="mt-1 font-bold">{agent.name}</h3>
                <p className="mt-1 text-xs text-slate-600">{agent.job}</p>
                <button
                  type="button"
                  onClick={() => runAgent(agent.id)}
                  disabled={Boolean(runningAgent)}
                  className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {runningAgent === agent.id ? "作業中..." : output ? "再作業する" : "作業する"}
                </button>
                {output ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-slate-600">成果物を見る</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-700">{output}</pre>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      ) : null}

      {view === "buzz" ? (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">バズネタ収集</h2>
              <p className="mt-1 text-sm text-slate-600">
                Xのバズ投稿から、言葉ではなく「話題・切り口・構成」だけを参考にしてThreads案を作ります。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveXSearchSettings()}
                className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                  actionFeedback === "x-search-save" ? "bg-green-500 text-white" : ""
                }`}
              >
                {actionFeedback === "x-search-save" ? "保存済み" : "条件を保存"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-pink-200 bg-pink-50 p-3 text-sm text-pink-700">
            <p className="font-bold">安全ルール</p>
            <p className="mt-1">
              元投稿の文章はコピーしません。AI案は必ず編集・確認してから、既存の投稿カレンダーへ送ります。
            </p>
          </div>

          <div
            className={`mt-3 rounded-md border p-3 text-sm ${
              xConnectionStatus?.isApiReady
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-yellow-200 bg-yellow-50 text-yellow-800"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">
                  X接続状態: {xConnectionStatus?.isApiReady ? "本接続OK" : "まだテスト取得"}
                </p>
                <p className="mt-1">
                  {xConnectionStatus?.message || "接続状態を確認しています。"}
                </p>
              </div>
              <button
                type="button"
                onClick={refreshXConnectionStatus}
                className="rounded-md border border-current px-3 py-2 text-xs font-bold"
              >
                状態を再確認
              </button>
            </div>
          </div>

          {xBuzzError ? <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{xBuzzError}</p> : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-lg border border-slate-200 p-3">
              <div>
                <h3 className="font-bold">かんたん収集設定</h3>
                <p className="mt-1 text-xs text-slate-500">普段はここだけでOKです。細かい条件は下に隠しています。</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { name: "AI投稿", keywords: "ChatGPT\nClaude\nAI活用\nSNS運用", minimumEngagements: 20, minimumLikes: 0, fetchLimit: 15 },
                  { name: "副業", keywords: "AI副業\n副業\n在宅ワーク\nSNS集客", minimumEngagements: 20, minimumLikes: 0, fetchLimit: 15 },
                  { name: "看護師副業", keywords: "看護師副業\n看護師 在宅\nナース副業", minimumEngagements: 10, minimumLikes: 0, fetchLimit: 15 },
                  { name: "美容×AI", keywords: "美容 AI\n美容 SNS\n美容集客", minimumEngagements: 10, minimumLikes: 0, fetchLimit: 15 }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      updateActiveXSearchSetting("name", preset.name);
                      updateActiveXSearchSetting("keywords", preset.keywords);
                      updateActiveXSearchSetting("minimumImpressions", 0);
                      updateActiveXSearchSetting("minimumEngagements", preset.minimumEngagements);
                      updateActiveXSearchSetting("minimumLikes", preset.minimumLikes);
                      updateActiveXSearchSetting("fetchLimit", preset.fetchLimit);
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-bold ${
                      activeXSearchSetting.name === preset.name
                        ? "border-pink-600 bg-pink-50 text-pink-700"
                        : "border-slate-300"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <TextArea
                label="探したいテーマ・キーワード"
                value={activeXSearchSetting.keywords}
                onChange={(value) => updateActiveXSearchSetting("keywords", value)}
                rows={4}
                help="迷ったらプリセットを押してください。1行に1つだけ入れます。"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberInput
                  label="最低反応数"
                  value={activeXSearchSetting.minimumEngagements ?? defaultXSearchSetting.minimumEngagements}
                  onChange={(value) => updateActiveXSearchSetting("minimumEngagements", value)}
                />
                <NumberInput
                  label="取得件数"
                  value={activeXSearchSetting.fetchLimit}
                  onChange={(value) => updateActiveXSearchSetting("fetchLimit", value)}
                />
              </div>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={fetchXTrendingPosts}
                  disabled={xBuzzLoading || !activeXSearchSetting.isActive}
                  className="rounded-md bg-pink-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-45"
                >
                  {xBuzzLoading ? "集めています..." : "この条件でバズ投稿を集める"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveXSearchSetting("minimumImpressions", 0);
                    updateActiveXSearchSetting("minimumEngagements", 0);
                    updateActiveXSearchSetting("minimumLikes", 0);
                    updateActiveXSearchSetting("minimumReposts", 0);
                    updateActiveXSearchSetting("fetchLimit", 30);
                    flash("条件をゆるめました。もう一度バズ投稿を集めてください");
                  }}
                  className="rounded-md border border-pink-300 bg-pink-50 px-4 py-2 text-sm font-bold text-pink-700"
                >
                  0件なら条件をゆるめる
                </button>
                <button
                  type="button"
                  onClick={() => saveXSearchSettings()}
                  className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                    actionFeedback === "x-search-save" ? "bg-green-500 text-white" : ""
                  }`}
                >
                  {actionFeedback === "x-search-save" ? "保存済み" : "今の条件を保存"}
                </button>
              </div>
              <details className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
                <summary className="cursor-pointer font-bold">詳細設定を開く</summary>
                <label className="mt-3 block text-sm font-bold">
                  保存済み条件
                  <select
                    value={activeXSearchId}
                    onChange={(event) => setActiveXSearchId(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  >
                    {xSearchSettings.map((setting) => (
                      <option key={setting.id} value={setting.id}>
                        {setting.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={addXSearchSetting} className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold">
                  条件を追加
                </button>
                <Input
                  label="条件名"
                  value={activeXSearchSetting.name}
                  onChange={(value) => updateActiveXSearchSetting("name", value)}
                />
                <TextArea
                  label="ハッシュタグ"
                  value={activeXSearchSetting.hashtags}
                  onChange={(value) => updateActiveXSearchSetting("hashtags", value)}
                  rows={3}
                />
                <TextArea
                  label="参考にするXアカウント"
                  value={activeXSearchSetting.targetAccounts}
                  onChange={(value) => updateActiveXSearchSetting("targetAccounts", value)}
                  rows={3}
                  help="@IDやURLを1行に1つ。公式API利用時に検索条件へ反映します。"
                />
                <TextArea
                  label="除外キーワード"
                  value={activeXSearchSetting.excludedKeywords}
                  onChange={(value) => updateActiveXSearchSetting("excludedKeywords", value)}
                  rows={3}
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input
                    label="対象言語"
                    value={activeXSearchSetting.language}
                    onChange={(value) => updateActiveXSearchSetting("language", value)}
                  />
                  <NumberInput
                    label="取得期間(日)"
                    value={activeXSearchSetting.periodDays}
                    onChange={(value) => updateActiveXSearchSetting("periodDays", value)}
                  />
                  <NumberInput
                    label="最低表示数（補助）"
                    value={activeXSearchSetting.minimumImpressions ?? defaultXSearchSetting.minimumImpressions}
                    onChange={(value) => updateActiveXSearchSetting("minimumImpressions", value)}
                  />
                  <NumberInput
                    label="最低いいね（補助）"
                    value={activeXSearchSetting.minimumLikes}
                    onChange={(value) => updateActiveXSearchSetting("minimumLikes", value)}
                  />
                  <NumberInput
                    label="最低リポスト"
                    value={activeXSearchSetting.minimumReposts}
                    onChange={(value) => updateActiveXSearchSetting("minimumReposts", value)}
                  />
                  <Input
                    label="ブランド"
                    value={activeXSearchSetting.brand}
                    onChange={(value) => updateActiveXSearchSetting("brand", value)}
                  />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={activeXSearchSetting.isActive}
                    onChange={(event) => updateActiveXSearchSetting("isActive", event.target.checked)}
                  />
                  この条件を有効にする
                </label>
              </details>
            </aside>

            <div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <label className="block text-sm font-bold">
                    表示順
                    <select
                      value={xSortKey}
                      onChange={(event) => setXSortKey(event.target.value as XSortKey)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="buzzScore">バズ度</option>
                      <option value="impressionCount">表示数</option>
                      <option value="likeCount">いいね数</option>
                      <option value="repostCount">リポスト数</option>
                      <option value="engagementRate">反応率</option>
                      <option value="postedAt">投稿日</option>
                    </select>
                  </label>
                  <p className="text-sm text-slate-600">
                  表示中 {visibleXTrendingPosts.length}件 / 保存済み {xTrendingPosts.length}件
                  </p>
                </div>
                <div className="mt-3 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">
                  <p className="font-bold">次にやること</p>
                  <p className="mt-1">
                    投稿が集まったら、各カードの「AI分析してThreads案を作る」を押してください。押すと分析結果と投稿案3つがカード内に出ます。
                  </p>
                </div>
                <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  <p className="font-bold">0件になる主な理由</p>
                  <p className="mt-1">
                    X APIから最大100件の候補を取得し、その後に「最低反応数」で絞ります。出ない時は最低反応数を10まで下げるか、ベンチマークのXアカウントを詳細設定に入れてください。
                  </p>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-bold text-slate-600">絞り込みを開く</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <NumberInput label="最低バズ度" value={xMinimumBuzz} onChange={setXMinimumBuzz} />
                    <label className="mt-6 flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={xOnlyFavorite} onChange={(event) => setXOnlyFavorite(event.target.checked)} />
                      お気に入りのみ
                    </label>
                    <label className="mt-6 flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={xHideHidden} onChange={(event) => setXHideHidden(event.target.checked)} />
                      非表示を除外
                    </label>
                  </div>
                </details>
              </div>

              <div className="mt-3 space-y-3">
                {visibleXTrendingPosts.length ? (
                  visibleXTrendingPosts.map((post) => (
                    <XTrendingPostCard
                      key={post.id}
                      post={post}
                      analysisResult={xAnalyses[post.id]}
                      copiedId={copiedId}
                      analyzing={xAnalyzingId === post.id}
                      onAnalyze={() => analyzeXTrendingPost(post)}
                      onCopy={copyText}
                      onToggleFavorite={() => updateXPost(post.id, { isFavorite: !post.isFavorite })}
                      onHide={() => updateXPost(post.id, { isHidden: true, status: "非表示" })}
                      onDraftChange={(draftIndex, patch) => updateXDraft(post.id, draftIndex, patch)}
                      onSendDraft={(draft) => sendBuzzDraftToCalendar(post, draft)}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
                    まだ投稿候補がありません。左の「この条件でバズ投稿を集める」を押すと投稿カードが表示されます。AI分析ボタンは投稿カードの中に出ます。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === "calendar" ? (
      <>
      <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">3. 投稿を生成</h2>
        <p className="mt-1 text-sm text-slate-600">Threadsは短め、120〜220字目安で作ります。</p>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-bold">投稿作成の基本設定</h3>
              <p className="mt-1 text-sm text-slate-600">
                ここは自動予約ではなく、7日分を作る開始日とThreadsで手動予約するときの目安時間です。
              </p>
            </div>
            <button
              type="button"
              onClick={saveSchedule}
              className={`rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                actionFeedback === "schedule-save" ? "bg-green-500 text-white" : ""
              }`}
            >
              {actionFeedback === "schedule-save" ? "保存済み" : "設定を保存"}
            </button>
          </div>
          <div className="mt-3 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-bold text-pink-700">
            投稿は自動では出ません。7日分ができたら、下の「Threads予約作業リスト」から本文をコピーしてThreads側で予約してください。
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold">投稿開始日</span>
              <input
                type="date"
                value={scheduleStartDate}
                onChange={(event) => setScheduleStartDate(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <p className="font-bold text-slate-800">今の運用</p>
              <p className="mt-1">AI投稿中心。無料相談への誘導は週1〜2本だけに抑えます。</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold">Threadsで予約するときの目安時間</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {postTimes.map((time, index) => (
              <label key={index} className="block">
                <span className="text-sm font-bold">{index + 1}投稿目</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => updatePostTime(index, event.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            ))}
          </div>
        </div>
        {error ? <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-md bg-pink-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "AIが投稿を作成中..." : "投稿を生成する"}
        </button>
        {loading ? <ProgressPanel elapsedSeconds={elapsedSeconds} /> : null}
      </form>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">生成結果</h2>
            <p className="mt-1 text-sm text-slate-600">投稿日と投稿時間を確認し、Threads側で予約したものに✅を付けられます。</p>
          </div>
          <button
            type="button"
            onClick={() => copyText("calendar-text", buildCalendarText())}
            disabled={!result?.weekly?.length}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {copiedId === "calendar-text" ? "コピーしました" : "一覧をコピー"}
          </button>
          <button
            type="button"
            onClick={() => copyText("reminder-text", buildReminderText())}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold"
          >
            {copiedId === "reminder-text" ? "コピーしました" : "2週間前催促をコピー"}
          </button>
        </div>
        {loading ? <p className="mt-4 text-slate-600">投稿文を整えています。1週間分なので少し時間がかかります。</p> : null}
        {!result && !loading ? <p className="mt-4 text-slate-600">ここに生成結果が表示されます。</p> : null}
        {Object.keys(scheduledIds).length ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-pink-50 p-3">
            <h3 className="font-bold">✅ 予約済み一覧</h3>
            <p className="mt-1 text-xs text-slate-600">Threads側で予約できた投稿のチェック一覧です。自動投稿ではありません。</p>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(scheduledIds).map(([id, label]) => (
                <li key={id}>✅ {label}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {result?.checkpoints?.length ? <CheckpointPanel checkpoints={result.checkpoints} /> : null}
        {result?.weekly?.length ? (
          <WeeklyPlan
            weekly={result.weekly}
            copiedId={copiedId}
            postedIds={postedIds}
            scheduledIds={scheduledIds}
            scheduleStartDate={scheduleStartDate}
            postTimes={postTimes}
            onCopy={copyText}
            onPublish={publishToThreads}
            onPublishAll={publishManyToThreads}
            onSchedule={addToSchedule}
            onScheduleAll={addManyToSchedule}
            onEditTitle={updateWeeklyPostTitle}
            onEditBody={updateWeeklyPostBody}
          />
        ) : result ? (
          <PostGroup
            title="Threads投稿"
            posts={result.threads}
            copiedId={copiedId}
            postedIds={postedIds}
            onCopy={copyText}
            onPublish={publishToThreads}
            prefix="threads"
          />
        ) : null}
      </section>
      </>
      ) : null}

      {view === "history" ? (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">履歴</h2>
        <div className="mt-3 space-y-2">
          {history.length ? (
            history.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => loadHistory(item)}
                className="block w-full rounded-md border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
              >
                {item.mode === "weekly" ? "1週間分" : "単発"} / {new Date(item.createdAt).toLocaleString("ja-JP")}
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-600">生成するとここに保存されます。</p>
          )}
        </div>
      </section>
      ) : null}
    </main>
  );
}

function XTrendingPostCard({
  post,
  analysisResult,
  copiedId,
  analyzing,
  onAnalyze,
  onCopy,
  onToggleFavorite,
  onHide,
  onDraftChange,
  onSendDraft
}: {
  post: XTrendingPost;
  analysisResult?: XBuzzAnalyzeResult;
  copiedId: string;
  analyzing: boolean;
  onAnalyze: () => void;
  onCopy: (id: string, text: string) => void;
  onToggleFavorite: () => void;
  onHide: () => void;
  onDraftChange: (draftIndex: number, patch: Partial<ThreadsDraftIdea>) => void;
  onSendDraft: (draft: ThreadsDraftIdea) => void;
}) {
  const engagementLabel = post.engagementRate === undefined ? "不明" : `${post.engagementRate}%`;
  const impressionLabel = typeof post.impressionCount === "number" ? post.impressionCount.toLocaleString("ja-JP") : "不明";
  const riskLabel = analysisResult?.analysis.riskLevel || "未分析";

  return (
    <article className={`rounded-lg border p-3 ${post.isHidden ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-700">バズ度 {post.buzzScore}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">表示 {impressionLabel}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">いいね {post.likeCount}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">リポスト {post.repostCount}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">反応率 {engagementLabel}</span>
            {post.hasMedia ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">画像/動画あり</span> : null}
          </div>
          <p className="mt-3 text-sm font-bold">
            {post.authorName} <span className="text-slate-500">@{post.authorUsername}</span>
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">投稿本文を見る</summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{post.text}</p>
          </details>
          <p className="mt-2 text-xs text-slate-500">
            投稿日: {new Date(post.postedAt).toLocaleString("ja-JP")} / 状態: {post.status}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-48 lg:grid-cols-1">
          <button type="button" onClick={() => window.open(post.postUrl, "_blank", "noopener,noreferrer")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
            元投稿を開く
          </button>
          <button type="button" onClick={onAnalyze} disabled={analyzing} className="rounded-md bg-pink-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-45">
            {analyzing ? "分析中..." : analysisResult ? "再分析して3案作る" : "AI分析してThreads案を作る"}
          </button>
          <button type="button" onClick={onToggleFavorite} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
            {post.isFavorite ? "★ お気に入り" : "☆ お気に入り"}
          </button>
          <button type="button" onClick={onHide} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
            非表示
          </button>
        </div>
      </div>

      {analysisResult ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h4 className="font-bold">AI分析</h4>
              <dl className="mt-2 space-y-2 text-sm">
                <div>
                  <dt className="font-bold">主題</dt>
                  <dd className="text-slate-600">{analysisResult.analysis.topic}</dd>
                </div>
                <div>
                  <dt className="font-bold">伸びた理由</dt>
                  <dd className="text-slate-600">{analysisResult.analysis.viralReason}</dd>
                </div>
                <div>
                  <dt className="font-bold">フック型</dt>
                  <dd className="text-slate-600">{analysisResult.analysis.hookPattern}</dd>
                </div>
                <div>
                  <dt className="font-bold">リスク</dt>
                  <dd className="text-slate-600">
                    {riskLabel} / 相性 {analysisResult.analysis.brandFitScore}点
                    {analysisResult.analysis.needsFactCheck ? " / 要ファクトチェック" : ""}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <h4 className="font-bold">Threads投稿案 3案</h4>
              {analysisResult.drafts.map((draft, draftIndex) => {
                const fullText = [draft.opening, draft.body, draft.closing]
                  .filter(Boolean)
                  .join("\n\n");

                return (
                  <div key={`${post.id}-draft-${draftIndex}`} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-bold">{draftIndex + 1}. {draft.type}</p>
                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className={`rounded-full px-2 py-1 ${
                          draft.similarityRisk === "high"
                            ? "bg-red-100 text-red-700"
                            : draft.similarityRisk === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}>
                          類似リスク {draft.similarityRisk} / {draft.similarityScore}
                        </span>
                        {draft.needsFactCheck ? <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">要確認</span> : null}
                      </div>
                    </div>
                    <label className="mt-2 block text-xs font-bold text-slate-600">
                      投稿文
                      <textarea
                        value={fullText}
                        onChange={(event) => onDraftChange(draftIndex, { body: event.target.value, opening: "", closing: "", hashtags: [] })}
                        rows={7}
                        className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm leading-6"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-600">追加すべき独自情報: {draft.originalInfoNeeded || "なし"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onCopy(`x-draft-${post.id}-${draftIndex}`, fullText)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
                        {copiedId === `x-draft-${post.id}-${draftIndex}` ? "コピー済み" : "コピー"}
                      </button>
                      <button type="button" onClick={onAnalyze} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
                        AIで再生成
                      </button>
                      <button type="button" onClick={() => onSendDraft(draft)} className="rounded-md bg-pink-600 px-3 py-2 text-sm font-bold text-white">
                        投稿カレンダーへ送る
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-3 text-sm font-bold ${
        active ? "border-pink-600 bg-pink-600 text-white" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function MobileNavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-md border px-1 text-[11px] font-bold ${
        active ? "border-pink-600 bg-pink-600 text-white" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  help
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-bold ${
        active ? "border-pink-600 bg-pink-50 text-pink-700" : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressPanel({ elapsedSeconds }: { elapsedSeconds: number }) {
  const message =
    elapsedSeconds < 20
      ? "素材とAI社員メモを読んでいます"
      : elapsedSeconds < 60
        ? "7日分のテーマと本文を組み立てています"
        : elapsedSeconds < 100
          ? "投稿ごとの分析と導線の温度感を整えています"
          : "まだ作成中です。長い場合はOpenAI APIの応答待ちです";

  return (
    <div className="mt-4 rounded-md border border-pink-200 bg-pink-50 p-4">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
        <div>
          <p className="font-bold">{message}</p>
          <p className="mt-1 text-sm text-slate-600">経過時間: {elapsedSeconds}秒</p>
        </div>
      </div>
      {elapsedSeconds > 90 ? (
        <p className="mt-3 text-sm text-slate-600">
          90秒を超えることがあります。画面を閉じずに待ってください。失敗した場合はエラーが表示されます。
        </p>
      ) : null}
    </div>
  );
}

function CheckpointPanel({ checkpoints }: { checkpoints: Checkpoint[] }) {
  return (
    <div className="mt-4 rounded-md bg-pink-50 p-4">
      <h3 className="font-bold">月4回の確認で見ること</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {checkpoints.map((checkpoint, index) => (
          <div key={`${checkpoint.title}-${index}`} className="rounded-md border border-pink-100 bg-white p-3 text-sm">
            <p className="font-bold">{index + 1}. {checkpoint.title}</p>
            <p className="mt-1 text-slate-600">{checkpoint.whatToCheck}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyPlan({
  weekly,
  copiedId,
  postedIds,
  scheduledIds,
  scheduleStartDate,
  postTimes,
  onCopy,
  onPublish,
  onPublishAll,
  onSchedule,
  onScheduleAll,
  onEditTitle,
  onEditBody
}: {
  weekly: WeeklyDay[];
  copiedId: string;
  postedIds: Record<string, string>;
  scheduledIds: Record<string, string>;
  scheduleStartDate: string;
  postTimes: string[];
  onCopy: (id: string, text: string) => void;
  onPublish: (id: string, text: string) => void;
  onPublishAll: (items: { id: string; text: string }[]) => void;
  onSchedule: (id: string, label: string) => void;
  onScheduleAll: (items: { id: string; label: string }[]) => void;
  onEditTitle: (dayIndex: number, postIndex: number, title: string) => void;
  onEditBody: (dayIndex: number, postIndex: number, body: string) => void;
}) {
  const events = weekly.flatMap((day, dayIndex) =>
    day.posts.map((post, postIndex) => ({
      id: `weekly-${scheduleStartDate}-${dayIndex}-${postIndex}`,
      date: addDays(scheduleStartDate, dayIndex),
      time: postTimes[postIndex] || "未設定",
      day,
      dayIndex,
      postIndex,
      post
    }))
  );
  const calendarDays = buildMonthCalendar(scheduleStartDate);
  const monthLabel = formatMonthLabel(scheduleStartDate);
  const scheduleItems = events.map((event) => ({
    id: event.id,
    label: `${event.date} ${event.time} ${event.post.title}`
  }));

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{monthLabel}</h3>
          <p className="text-sm text-slate-600">予定時刻はThreads側で手動予約するときの目安です。</p>
        </div>
        <div className="grid gap-2 sm:flex">
          <button
            type="button"
            onClick={() => onScheduleAll(scheduleItems)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-45"
            disabled={events.every((event) => scheduledIds[event.id])}
          >
            未チェックをまとめて✅にする
          </button>
          <button
            type="button"
            onClick={() =>
              onPublishAll(
                events.map((event) => ({
                  id: event.id,
                  text: event.post.body
                }))
              )
            }
            className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
            disabled={events.every((event) => postedIds[event.id])}
          >
            未投稿を今すぐまとめて投稿
          </button>
        </div>
      </div>
      <p className="mb-3 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-bold text-pink-700">
        7日分ができたら、下の一覧を上から順にコピーしてThreads側で予約してください。予約が終わった投稿に✅を付けて管理できます。
      </p>
      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold">Threads予約作業リスト</h3>
            <p className="mt-1 text-xs text-slate-600">
              この一覧は手動予約の確認用です。ここで✅を付けても自動投稿はされません。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onScheduleAll(scheduleItems)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-45"
            disabled={events.every((event) => scheduledIds[event.id])}
          >
            全部✅チェックする
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {events.map((event) => {
            const isScheduled = Boolean(scheduledIds[event.id]);
            return (
              <article
                key={`reservation-${event.id}`}
                className={`rounded-md border p-3 ${
                  isScheduled ? "border-green-400 bg-green-500/10" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-pink-600">
                      {event.date} {event.time} / {event.day.day}
                    </p>
                    <h4 className="mt-1 break-words font-bold">{event.post.title}</h4>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                      {event.post.body}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-44 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => onCopy(`reserve-copy-${event.id}`, event.post.body)}
                      className="rounded-md border border-slate-300 px-3 py-3 text-sm font-bold"
                    >
                      {copiedId === `reserve-copy-${event.id}` ? "コピー済み" : "本文コピー"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSchedule(event.id, `${event.date} ${event.time} ${event.post.title}`)}
                      className={`rounded-md px-3 py-3 text-sm font-bold ${
                        isScheduled ? "bg-green-500 text-white" : "border border-slate-300"
                      }`}
                    >
                      {isScheduled ? "✅ 予約済み" : "Threadsで予約できた"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="space-y-3 sm:hidden">
        {events.map((event) => (
          <article key={`mobile-${event.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-pink-600">
                  {event.date} {event.time}
                </p>
                <h4 className="mt-1 font-bold">{event.post.title}</h4>
                <p className="mt-1 text-xs text-slate-600">{event.day.theme}</p>
                {scheduledIds[event.id] ? (
                  <p className="mt-2 inline-flex rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">
                    ✅ 予約済み
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-pink-600 px-2 py-1 text-xs font-bold text-white">
                {event.postIndex + 1}
              </span>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              タイトル
              <input
                type="text"
                value={event.post.title}
                onChange={(changeEvent) =>
                  onEditTitle(event.dayIndex, event.postIndex, changeEvent.target.value)
                }
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-bold"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              投稿文（ここで修正できます）
              <textarea
                value={event.post.body}
                onChange={(changeEvent) =>
                  onEditBody(event.dayIndex, event.postIndex, changeEvent.target.value)
                }
                rows={6}
                className="mt-1 w-full resize-y rounded border border-slate-300 p-3 font-sans text-sm leading-6"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSchedule(event.id, `${event.date} ${event.time} ${event.post.title}`)}
                disabled={Boolean(scheduledIds[event.id])}
                className="col-span-2 rounded-md border border-slate-300 px-3 py-3 text-sm font-bold disabled:opacity-45"
              >
                {scheduledIds[event.id] ? "✅ 予約済み" : "Threadsで予約できた"}
              </button>
              <button
                type="button"
                onClick={() => onCopy(event.id, event.post.body)}
                className="rounded-md border border-slate-300 px-3 py-3 text-sm font-bold"
              >
                {copiedId === event.id ? "コピー済み" : "コピー"}
              </button>
              <button
                type="button"
                onClick={() => onPublish(event.id, event.post.body)}
                disabled={Boolean(postedIds[event.id])}
                className="rounded-md bg-pink-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-45"
              >
                {postedIds[event.id] ? "投稿済み" : "今すぐ投稿"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden grid-cols-7 border-l border-t border-slate-200 text-center text-xs font-bold text-slate-600 sm:grid">
        {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => (
          <div key={weekday} className="border-b border-r border-slate-200 px-2 py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="hidden grid-cols-7 border-l border-slate-200 sm:grid">
        {calendarDays.map((calendarDay) => {
          const dayEvents = events.filter((event) => event.date === calendarDay.date);
          return (
            <div
              key={calendarDay.date}
              className={`min-h-40 border-b border-r border-slate-200 p-2 ${
                calendarDay.inMonth ? "bg-white" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${calendarDay.inMonth ? "" : "text-slate-500"}`}>
                  {calendarDay.dayNumber}
                </span>
                {dayEvents.length ? (
                  <span className="rounded-full bg-pink-600 px-2 py-0.5 text-xs font-bold text-white">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-1">
                {dayEvents.map((event) => (
                  <details key={event.id} className="rounded bg-pink-600/90 px-2 py-1 text-left text-xs text-white">
                    <summary className="cursor-pointer list-none">
                      <span className="font-bold">{event.time}</span> {event.post.title}
                      {scheduledIds[event.id] ? <span className="ml-1">✅</span> : null}
                    </summary>
                    <div className="mt-2 rounded bg-black/20 p-2">
                      <p className="font-bold">{event.day.theme}</p>
                      <label className="mt-2 block text-[11px] font-bold text-white/80">
                        タイトル
                        <input
                          type="text"
                          value={event.post.title}
                          onChange={(changeEvent) =>
                            onEditTitle(event.dayIndex, event.postIndex, changeEvent.target.value)
                          }
                          className="mt-1 w-full rounded border border-white/30 bg-black/30 px-2 py-1 text-xs font-bold text-white outline-none focus:border-white"
                        />
                      </label>
                      <label className="mt-2 block text-[11px] font-bold text-white/80">
                        投稿文（ここで修正できます）
                        <textarea
                          value={event.post.body}
                          onChange={(changeEvent) =>
                            onEditBody(event.dayIndex, event.postIndex, changeEvent.target.value)
                          }
                          rows={7}
                          className="mt-1 w-full resize-y rounded border border-white/30 bg-black/30 p-2 font-sans text-xs leading-5 text-white outline-none focus:border-white"
                        />
                      </label>
                      <p className="mt-2 text-[11px] text-white/75">今すぐ投稿ボタンは予約ではなく、押した瞬間に投稿されます。</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSchedule(event.id, `${event.date} ${event.time} ${event.post.title}`)}
                          disabled={Boolean(scheduledIds[event.id])}
                          className="rounded border border-white/40 px-2 py-1 font-bold disabled:opacity-45"
                        >
                          {scheduledIds[event.id] ? "✅ 予約済み" : "Threadsで予約できた"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(event.id, event.post.body)}
                          className="rounded border border-white/40 px-2 py-1 font-bold"
                        >
                          {copiedId === event.id ? "コピー済み" : "コピー"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPublish(event.id, event.post.body)}
                          disabled={Boolean(postedIds[event.id])}
                          className="rounded border border-white/40 px-2 py-1 font-bold disabled:opacity-45"
                        >
                          {postedIds[event.id] ? "投稿済み" : "今すぐ投稿"}
                        </button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function addDays(startDate: string, days: number) {
  const date = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mergeXPosts(current: XTrendingPost[], incoming: XTrendingPost[]) {
  const map = new Map<string, XTrendingPost>();
  current.forEach((post) => map.set(post.xPostId, post));
  incoming.forEach((post) => {
    const existing = map.get(post.xPostId);
    map.set(post.xPostId, existing ? { ...post, ...existing, buzzScore: post.buzzScore } : post);
  });
  return Array.from(map.values());
}

function buildMonthCalendar(startDate: string) {
  const base = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === base.getMonth()
    };
  });
}

function formatMonthLabel(startDate: string) {
  const base = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  return `${base.getFullYear()}年${base.getMonth() + 1}月`;
}

function PostGroup({
  title,
  posts,
  copiedId,
  postedIds,
  onCopy,
  onPublish,
  prefix
}: {
  title: string;
  posts: GeneratedPost[];
  copiedId: string;
  postedIds: Record<string, string>;
  onCopy: (id: string, text: string) => void;
  onPublish: (id: string, text: string) => void;
  prefix: string;
}) {
  return (
    <div className="mt-4">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {posts.map((post, index) => {
          const id = `${prefix}-${index}`;
          return (
            <article key={id} className="rounded-md border border-slate-200 p-3">
              <h4 className="font-bold">{post.title}</h4>
              <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">{post.body}</pre>
              <button
                type="button"
                onClick={() => onCopy(id, post.body)}
                className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold"
              >
                {copiedId === id ? "コピーしました" : "コピー"}
              </button>
              <button
                type="button"
                onClick={() => onPublish(id, post.body)}
                disabled={Boolean(postedIds[id])}
                className="ml-2 mt-3 rounded-md bg-pink-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-45"
              >
                {postedIds[id] ? "投稿済み" : "Threadsに投稿"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
