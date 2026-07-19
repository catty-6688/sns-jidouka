import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PublishRequest = {
  text: string;
};

function getToken(request: Request) {
  const headerToken = request.headers.get("x-threads-token")?.trim();
  return headerToken || process.env.THREADS_ACCESS_TOKEN || "";
}

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.json(
      { message: "Threadsアクセストークンが未設定です。" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as PublishRequest | null;
  const text = pickString(body?.text);

  if (!text) {
    return NextResponse.json({ message: "投稿本文が空です。" }, { status: 400 });
  }

  if (text.length > 500) {
    return NextResponse.json(
      { message: "Threads投稿は500文字以内にしてください。" },
      { status: 400 }
    );
  }

  const url = new URL("https://graph.threads.net/me/threads");
  url.searchParams.set("media_type", "TEXT");
  url.searchParams.set("text", text);
  url.searchParams.set("auto_publish_text", "true");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data?.error?.message || "Threads投稿に失敗しました。",
          detail: data
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Threadsに投稿しました。",
      id: data.id,
      raw: data
    });
  } catch {
    return NextResponse.json(
      { message: "Threads APIに接続できませんでした。" },
      { status: 500 }
    );
  }
}
