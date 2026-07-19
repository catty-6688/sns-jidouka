# SNS投稿半自動化ツール

AI初心者でも、Threads・X向けの投稿をまとめて作れるローカルWebアプリです。

入力するものは次の4つだけです。

- 投稿ジャンル
- ターゲット
- 悩み
- 投稿トーン

生成されるもの:

- Threads投稿 3本
- X投稿 3本
- CTA付き
- 改行済み
- ワンクリックコピー対応
- 履歴保存対応
- テンプレ切り替え対応

## 1. 必要なもの

最初に、次の2つを用意してください。

- Node.js
- OpenAI APIキー

Node.jsは、Next.jsアプリを動かすために必要です。

OpenAI APIキーは、AIに投稿文を作ってもらうために必要です。

## 2. Node.jsをインストールする

まだNode.jsが入っていない場合は、公式サイトからLTS版をインストールしてください。

インストールできたか確認します。

```bash
node -v
```

続けて、npmも確認します。

```bash
npm -v
```

どちらもバージョン番号が表示されればOKです。

例:

```bash
v22.11.0
10.9.0
```

## 3. このフォルダに移動する

ターミナル、PowerShell、またはコマンドプロンプトを開き、このプロジェクトのフォルダに移動します。

Windowsの場合:

```bash
cd C:\projects\sns-jidouka
```

Macの場合は、保存した場所に合わせて移動してください。

```bash
cd ~/projects/sns-jidouka
```

## 4. 必要なパッケージをインストールする

次のコマンドを実行します。

```bash
npm install
```

少し時間がかかることがあります。

完了すると、`node_modules`フォルダと`package-lock.json`が作られます。

PowerShellで`npm`が動かない場合は、次のコマンドを使ってください。

```bash
npm.cmd install
```

もしnpmのキャッシュ権限エラーが出る場合は、作業フォルダ内にキャッシュを作る形で実行できます。

```bash
npm.cmd install --cache .\.npm-cache
```

## 5. OpenAI APIキーを設定する

このアプリは、APIキーを安全に扱うために`.env.local`というファイルを使います。

まず、サンプルファイルをコピーします。

Windows PowerShellの場合:

```bash
Copy-Item .env.example .env.local
```

Macの場合:

```bash
cp .env.example .env.local
```

次に、`.env.local`を開いて中身を編集します。

```env
OPENAI_API_KEY=sk-ここにあなたのAPIキーを入れてください
OPENAI_MODEL=gpt-5-mini
```

`sk-ここにあなたのAPIキーを入れてください`の部分を、自分のOpenAI APIキーに置き換えてください。

例:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-mini
```

注意:

- `.env.local`は他人に見せないでください。
- GitHubなどにアップロードしないでください。
- `.env.local`を変更したら、開発サーバーを一度止めて再起動してください。

## 6. ローカルで起動する

次のコマンドを実行します。

```bash
npm run dev
```

成功すると、次のような表示が出ます。

```bash
Local: http://localhost:3000
```

ブラウザで次のURLを開きます。

```bash
http://localhost:3000
```

## 7. 使い方

1. 投稿ジャンルを入力します。
2. ターゲットを入力します。
3. 悩みを入力します。
4. 投稿トーンを選びます。
5. テンプレを選びます。
6. 「投稿を生成する」を押します。
7. 気に入った投稿の「ワンクリックコピー」を押してSNSに貼り付けます。

入力例:

```text
投稿ジャンル: AI副業
ターゲット: 副業を始めたい会社員
悩み: 何から始めればいいかわからない
投稿トーン: やさしい
テンプレ: 王道
```

## 8. よくあるエラーと対処法

### `OPENAI_API_KEYが設定されていません`

原因:

`.env.local`がない、またはAPIキーが入っていません。

対処法:

```bash
Copy-Item .env.example .env.local
```

`.env.local`を開き、APIキーを設定してください。

設定後、開発サーバーを止めます。

```bash
Ctrl + C
```

もう一度起動します。

```bash
npm run dev
```

### `投稿生成に失敗しました`

原因として多いもの:

- APIキーが間違っている
- OpenAIアカウントの残高や支払い設定に問題がある
- モデル名が間違っている
- インターネット接続が不安定

対処法:

`.env.local`の中身を確認してください。

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-mini
```

モデル名で迷う場合は、まず`.env.local`の`OPENAI_MODEL`を変更せず、そのまま使ってください。

### `npm install`で止まる

原因として多いもの:

- ネット接続が不安定
- Node.jsが古い
- 会社や学校のネットワークで制限されている
- WindowsのPowerShell実行ポリシーで`npm.ps1`が止まっている
- npmのキャッシュフォルダに書き込み権限がない

対処法:

Node.jsのバージョンを確認します。

```bash
node -v
```

古い場合は、Node.jsのLTS版を入れ直してください。

その後、もう一度実行します。

```bash
npm install
```

PowerShellで次のようなエラーが出る場合:

```text
このシステムではスクリプトの実行が無効になっているため
```

次のように`npm.cmd`を使ってください。

```bash
npm.cmd install
```

`EPERM`や`npm-cache`のエラーが出る場合:

```bash
npm.cmd install --cache .\.npm-cache
```

### `http://localhost:3000`が開けない

原因:

開発サーバーが起動していない可能性があります。

対処法:

```bash
npm run dev
```

もし`3000`番が使われている場合、Next.jsが別のURLを表示することがあります。

例:

```bash
http://localhost:3001
```

表示されたURLを開いてください。

## 9. フォルダ構成

```text
sns-jidouka/
├─ app/
│  ├─ api/
│  │  └─ generate/
│  │     └─ route.ts        # OpenAI APIを呼び出すサーバー処理
│  ├─ globals.css           # 全体のデザイン
│  ├─ layout.tsx            # 共通レイアウト
│  └─ page.tsx              # メイン画面
├─ .env.example             # 環境変数のサンプル
├─ .gitignore               # Gitに含めないファイル
├─ next.config.mjs          # Next.js設定
├─ package.json             # 使用パッケージとコマンド
├─ postcss.config.mjs       # TailwindCSS用設定
├─ tailwind.config.ts       # TailwindCSS設定
├─ tsconfig.json            # TypeScript設定
└─ README.md                # この説明書
```

## 10. 起動方法まとめ

初回だけ:

```bash
npm install
Copy-Item .env.example .env.local
```

PowerShellで`npm`が止まる場合:

```bash
npm.cmd install --cache .\.npm-cache
Copy-Item .env.example .env.local
```

`.env.local`にAPIキーを入れます。

毎回の起動:

```bash
npm run dev
```

ブラウザで開く:

```bash
http://localhost:3000
```

## 11. .env設定方法まとめ

`.env.local`を作成します。

```env
OPENAI_API_KEY=あなたのOpenAI APIキー
OPENAI_MODEL=gpt-5-mini
```

APIキーは必ずサーバー側だけで使います。

このアプリでは、画面側にAPIキーが表示されない構成にしています。

## 12. 今後の拡張案

- 投稿の文字数を自動チェックする
- ハッシュタグ候補を別枠で生成する
- 投稿カレンダー機能を追加する
- CSVで一括出力する
- NotionやGoogleスプレッドシートへ保存する
- 画像生成プロンプトも同時に作る
- 投稿済み、未投稿のステータス管理を追加する
- ログイン機能を追加して複数ユーザーで使えるようにする
- 履歴をローカル保存ではなくデータベースに保存する

## 13. 補足

このアプリは初心者がローカルで試しやすいように、最初は小さく作っています。

本番公開する場合は、API利用料の管理、認証、投稿履歴のデータベース化、利用制限などを追加するのがおすすめです。
