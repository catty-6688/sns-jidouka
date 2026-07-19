import { NextResponse } from "next/server";

export const runtime = "nodejs";

function html(content: string) {
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || "";
  const errorDescription = url.searchParams.get("error_description") || "";

  if (error) {
    return html(`
      <main style="font-family: sans-serif; max-width: 760px; margin: 48px auto; line-height: 1.7;">
        <h1>Threads認証でエラーが出ました</h1>
        <p><strong>${error}</strong></p>
        <p>${errorDescription}</p>
        <p>このページを閉じて、Meta Developers側の設定を確認してください。</p>
      </main>
    `);
  }

  if (!code) {
    return html(`
      <main style="font-family: sans-serif; max-width: 760px; margin: 48px auto; line-height: 1.7;">
        <h1>Threads認証コールバック</h1>
        <p>ここはThreads認証後に戻ってくるページです。</p>
        <p>まだ認証コードは届いていません。</p>
      </main>
    `);
  }

  return html(`
    <main style="font-family: sans-serif; max-width: 760px; margin: 48px auto; line-height: 1.7;">
      <h1>Threads認証コードを受け取りました</h1>
      <p>下のコードをコピーしてください。次にこのコードをアクセストークンへ交換します。</p>
      <textarea style="width: 100%; min-height: 120px; font-size: 14px;">${code}</textarea>
      <p>この画面のコードは短時間で期限切れになります。</p>
    </main>
  `);
}
