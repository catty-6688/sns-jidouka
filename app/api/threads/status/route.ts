import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getToken(request: Request) {
  const headerToken = request.headers.get("x-threads-token")?.trim();
  return headerToken || process.env.THREADS_ACCESS_TOKEN || "";
}

export async function GET(request: Request) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { connected: false, message: "Threadsアクセストークンが未設定です。" },
      { status: 200 }
    );
  }

  const url = new URL("https://graph.threads.net/me");
  url.searchParams.set("fields", "id,username,name");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          message: data?.error?.message || "Threadsアカウント確認に失敗しました。",
          detail: data
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      connected: true,
      account: data
    });
  } catch {
    return NextResponse.json(
      { connected: false, message: "Threads APIに接続できませんでした。" },
      { status: 200 }
    );
  }
}
