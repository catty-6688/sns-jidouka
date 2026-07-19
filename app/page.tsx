"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tone = "やさしい" | "煽り系" | "共感系" | "プロっぽい";
type Template = "basic" | "education" | "story";
type Mode = "single" | "weekly";
type AgentId = "research" | "buzz" | "account" | "planning" | "writing";
type View = "dashboard" | "profile" | "analysis" | "calendar" | "history";

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

const defaultProfile = {
  genre: "AI × 美容 × 副業/SNS集客",
  target:
    "MLMの集客に疲れた人、副業をやってみたけどうまくいかない人、美容が好きな人、自分が何者か知りたい人",
  pain:
    "少しでも行動したけどうまくできない人に届ける。すぐ稼げると思っている人、何もやりたくない人、楽して稼ぎたい人は対象外。",
  character:
    "副業で失敗した経験から、成功とは何かを見つけ、副業で6桁を達成した人。現実はちゃんと言うけれど、突き放さず、一歩を踏み出せるように一緒に整理する相談相手。ですます口調は遠く感じるので避ける。近い距離感で、自然体の話し言葉にする。例: 〜だと思う、〜してみて、〜なんだよね、〜でいい。",
  benchmarkAccounts: "",
  profileHistory:
    "ここにChatGPTで作ったプロフィール・経歴・過去のストーリーをそのまま貼り付けてください。",
  offer:
    "無料相談への予約。学ぶのは無料だと伝える。AIを教えられる強みは出すが、エステレラに参加して一緒に盛り上げてほしい話は大々的に言わず、無料相談で自然に話すためににおわせる程度にする。",
  personalExperiences:
    "AIを教えられるのが自分の強み。\n楽して稼ぎたい人より、少しでも行動している人を応援したい。\nMLM集客や副業で疲れている人に、AIを使って発信の負担を軽くする方法を伝えたい。\n美容が好きな人、学びながら自分の方向性を見つけたい人に合うと思っている。\nエステレラは無料で学べる点を大事に伝えたい。",
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
  const [postedIds, setPostedIds] = useState<Record<string, string>>({});
  const [scheduleStartDate, setScheduleStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [postTimes, setPostTimes] = useState(["08:00", "12:30", "20:00", ""]);
  const [bookingUrl, setBookingUrl] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [runningAgent, setRunningAgent] = useState<AgentId | "">("");
  const [loading, setLoading] = useState(false);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const isReady = useMemo(() => genre.trim() && target.trim() && pain.trim(), [genre, target, pain]);

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
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
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
        researchNotes
      })
    );
    flash("運用プロフィールを保存しました");
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
    setResearchNotes(defaultProfile.researchNotes);
    window.localStorage.removeItem(profileStorageKey);
    flash("初期設定に戻しました");
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(""), 1400);
  }

  function saveThreadsToken() {
    window.localStorage.setItem(threadsTokenStorageKey, threadsToken.trim());
    flash("Threadsトークンを保存しました");
  }

  function clearThreadsToken() {
    setThreadsToken("");
    setThreadsStatus("未接続");
    window.localStorage.removeItem(threadsTokenStorageKey);
    flash("Threadsトークンを消しました");
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
    flash("Threads認証設定を保存しました");
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
      flash("Threadsトークンを保存しました");
    } catch (caught) {
      setThreadsAuthStatus(caught instanceof Error ? caught.message : "アクセストークン取得でエラーが発生しました。");
    }
  }

  function saveSchedule() {
    window.localStorage.setItem(
      scheduleStorageKey,
      JSON.stringify({ scheduleStartDate, postTimes, bookingUrl })
    );
    flash("投稿カレンダー設定を保存しました");
  }

  function updatePostTime(index: number, value: string) {
    setPostTimes((current) => current.map((time, timeIndex) => (timeIndex === index ? value : time)));
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
            bookingUrl,
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
        `投稿開始日 ${scheduleStartDate} の2週間前です。7日分の投稿を確認し、予約ツールへ登録してください。予約URL: ${bookingUrl || "未設定"}`
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
    if (!window.confirm("この投稿をThreadsに投稿します。よろしいですか？")) return;

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
    setResearchNotes(item.researchNotes);
    setTone(item.tone);
    setTemplate(item.template);
    setResult(item.result);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-slate-950">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-sm font-bold text-pink-600">SNS投稿半自動化ツール</p>
        <h1 className="mt-1 text-3xl font-bold">Threads運用ダッシュボード</h1>
        <p className="mt-2 text-sm text-slate-600">月4回だけ確認。1回で7日分を作り、修正したら予約・投稿するだけにします。</p>
      </header>

      <nav className="mb-6 grid gap-2 sm:grid-cols-5">
        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")}>ダッシュボード</NavButton>
        <NavButton active={view === "profile"} onClick={() => setView("profile")}>素材設定</NavButton>
        <NavButton active={view === "analysis"} onClick={() => setView("analysis")}>AI分析</NavButton>
        <NavButton active={view === "calendar"} onClick={() => setView("calendar")}>投稿カレンダー</NavButton>
        <NavButton active={view === "history"} onClick={() => setView("history")}>履歴</NavButton>
      </nav>

      {notice ? <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p> : null}

      {view === "dashboard" ? (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold">今日やること</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <button type="button" onClick={() => setView("profile")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">1. 素材を確認</p>
              <p className="mt-1 text-sm text-slate-600">プロフィール、経歴、ベンチマークを入れる</p>
            </button>
            <button type="button" onClick={() => setView("analysis")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">2. AI社員に分析</p>
              <p className="mt-1 text-sm text-slate-600">リサーチ、バズ分析、企画を作る</p>
            </button>
            <button type="button" onClick={() => setView("calendar")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">3. 投稿生成と予約</p>
              <p className="mt-1 text-sm text-slate-600">7日分を月間カレンダーで確認</p>
            </button>
            <button type="button" onClick={() => setView("history")} className="rounded-md border border-slate-200 p-4 text-left hover:bg-slate-50">
              <p className="font-bold">4. 履歴を見る</p>
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
            <button type="button" onClick={saveThreadsToken} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white">
              保存
            </button>
            <button type="button" onClick={checkThreadsConnection} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              接続確認
            </button>
            <button type="button" onClick={clearThreadsToken} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              消す
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
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold"
            >
              認証設定を保存
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
            <button type="button" onClick={saveProfile} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white">
              保存
            </button>
            <button type="button" onClick={resetProfile} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              初期設定に戻す
            </button>
          </div>
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
          <TextArea label="CTA・無料相談の導線" value={offer} onChange={setOffer} rows={4} />
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

      {view === "calendar" ? (
      <>
      <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">3. 投稿を生成</h2>
        <p className="mt-1 text-sm text-slate-600">Threadsは短め、120〜220字目安で作ります。</p>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-bold">投稿カレンダー設定</h3>
              <p className="mt-1 text-sm text-slate-600">1回で7日分を作成。投稿開始日の2週間前に予約催促できる形にします。</p>
            </div>
            <button type="button" onClick={saveSchedule} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">
              カレンダー設定を保存
            </button>
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
            <label className="block">
              <span className="text-sm font-bold">相談予約URL</span>
              <input
                value={bookingUrl}
                onChange={(event) => setBookingUrl(event.target.value)}
                placeholder="予約ツールのURL"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
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
            <p className="mt-1 text-sm text-slate-600">カレンダー表示で投稿日と投稿時間を確認できます。</p>
          </div>
          <button
            type="button"
            onClick={() => copyText("calendar-text", buildCalendarText())}
            disabled={!result?.weekly?.length}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {copiedId === "calendar-text" ? "コピーしました" : "予約ツール用にコピー"}
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
        {result?.checkpoints?.length ? <CheckpointPanel checkpoints={result.checkpoints} /> : null}
        {result?.weekly?.length ? (
          <WeeklyPlan
            weekly={result.weekly}
            copiedId={copiedId}
            postedIds={postedIds}
            scheduleStartDate={scheduleStartDate}
            postTimes={postTimes}
            bookingUrl={bookingUrl}
            onCopy={copyText}
            onPublish={publishToThreads}
            onPublishAll={publishManyToThreads}
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
          ? "投稿ごとの分析とCTAを整えています"
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
  scheduleStartDate,
  postTimes,
  bookingUrl,
  onCopy,
  onPublish,
  onPublishAll,
  onEditTitle,
  onEditBody
}: {
  weekly: WeeklyDay[];
  copiedId: string;
  postedIds: Record<string, string>;
  scheduleStartDate: string;
  postTimes: string[];
  bookingUrl: string;
  onCopy: (id: string, text: string) => void;
  onPublish: (id: string, text: string) => void;
  onPublishAll: (items: { id: string; text: string }[]) => void;
  onEditTitle: (dayIndex: number, postIndex: number, title: string) => void;
  onEditBody: (dayIndex: number, postIndex: number, body: string) => void;
}) {
  const events = weekly.flatMap((day, dayIndex) =>
    day.posts.map((post, postIndex) => ({
      id: `weekly-${dayIndex}-${postIndex}`,
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

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{monthLabel}</h3>
          <p className="text-sm text-slate-600">月表示 / 投稿予定がある日だけ帯で表示</p>
        </div>
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
          未投稿をまとめて投稿
        </button>
      </div>
      <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-xs font-bold text-slate-600">
        {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => (
          <div key={weekday} className="border-b border-r border-slate-200 px-2 py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-slate-200">
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
                      <p className="mt-2">予約URL: {bookingUrl || "未設定"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                          {postedIds[event.id] ? "投稿済み" : "投稿"}
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
