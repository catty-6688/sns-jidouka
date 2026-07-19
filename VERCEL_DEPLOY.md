# Vercel公開とThreads連携の手順

このアプリを本格的にThreads自動投稿へ進めるには、先にVercelでHTTPSの本番URLを作ります。

## 1. Vercelで公開する

1. GitHubにこのプロジェクトをアップロードする
2. Vercelで `Add New Project` を押す
3. GitHubのこのリポジトリを選ぶ
4. Framework Preset は `Next.js`
5. Environment Variables に下の値を入れる

```env
OPENAI_API_KEY=あなたのOpenAI APIキー
OPENAI_MODEL=gpt-5-mini
NEXT_PUBLIC_APP_URL=https://あなたのアプリ.vercel.app
THREADS_APP_ID=MetaのThreads App ID
THREADS_APP_SECRET=MetaのThreads app secret
THREADS_ACCESS_TOKEN=最初は空でもOK
```

6. `Deploy` を押す
7. 公開URLを開いて画面が表示されればOK

## 2. Meta Developersに入れるURL

Vercel公開URLが次のような場合:

```text
https://your-app.vercel.app
```

Meta Developers の Threads API 設定には次を入れます。

```text
https://your-app.vercel.app/api/threads/callback
```

入れる場所:

- コールバックURLをリダイレクト
- コールバックURLをアンインストール
- コールバックURLを削除

## 3. Threadsユースケースで必要な権限

最低限:

```text
threads_basic
threads_content_publish
```

投稿後分析までやる場合:

```text
threads_manage_insights
```

## 4. 最初の接続テスト

1. Vercel公開URLを開く
2. `素材設定` を開く
3. Threadsアクセストークンを貼る
4. `保存`
5. `接続確認`
6. `テスト投稿`

## 5. 本格自動投稿に必要な次の作業

Vercel公開だけでは、まだ「予約時間になったら自動投稿」までは完成しません。

次に追加するもの:

- 投稿予約データを保存するDB
- Threads OAuthで取得したトークンの保存
- Vercel Cronで定期実行
- 投稿成功/失敗ログ
- 投稿後の分析データ取得

まずはVercel公開URLを作り、Meta DevelopersにコールバックURLを保存できる状態にするのが第一段階です。
