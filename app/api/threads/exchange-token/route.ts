import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExchangeRequest = {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
};

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ExchangeRequest> | null;
  const appId = pickString(body?.appId) || process.env.THREADS_APP_ID || "";
  const appSecret = pickString(body?.appSecret) || process.env.THREADS_APP_SECRET || "";
  const code = pickString(body?.code);
  const redirectUri = pickString(body?.redirectUri);

  if (!appId || !appSecret || !code || !redirectUri) {
    return NextResponse.json(
      { message: "App ID、App Secret、code、リダイレクトURLをすべて入力してください。" },
      { status: 400 }
    );
  }

  try {
    const shortTokenUrl = new URL("https://graph.threads.net/oauth/access_token");
    shortTokenUrl.searchParams.set("client_id", appId);
    shortTokenUrl.searchParams.set("client_secret", appSecret);
    shortTokenUrl.searchParams.set("code", code);
    shortTokenUrl.searchParams.set("grant_type", "authorization_code");
    shortTokenUrl.searchParams.set("redirect_uri", redirectUri);

    const shortResponse = await fetch(shortTokenUrl, {
      method: "POST",
      cache: "no-store"
    });
    const shortData = await shortResponse.json().catch(() => ({}));

    if (!shortResponse.ok || !shortData?.access_token) {
      return NextResponse.json(
        {
          message: shortData?.error?.message || "短期アクセストークンの取得に失敗しました。",
          detail: shortData
        },
        { status: 500 }
      );
    }

    const longTokenUrl = new URL("https://graph.threads.net/access_token");
    longTokenUrl.searchParams.set("grant_type", "th_exchange_token");
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("access_token", shortData.access_token);

    const longResponse = await fetch(longTokenUrl, {
      headers: {
        Authorization: `Bearer ${shortData.access_token}`
      },
      cache: "no-store"
    });
    const longData = await longResponse.json().catch(() => ({}));

    if (!longResponse.ok || !longData?.access_token) {
      return NextResponse.json({
        message: "短期アクセストークンは取得できました。長期化だけ失敗しました。",
        accessToken: shortData.access_token,
        userId: shortData.user_id,
        tokenType: "short_lived",
        detail: longData
      });
    }

    return NextResponse.json({
      message: "長期Threadsアクセストークンを取得しました。",
      accessToken: longData.access_token,
      userId: shortData.user_id,
      tokenType: "long_lived",
      expiresIn: longData.expires_in
    });
  } catch {
    return NextResponse.json(
      { message: "Threadsトークン交換APIに接続できませんでした。" },
      { status: 500 }
    );
  }
}
