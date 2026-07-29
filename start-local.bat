@echo off
cd /d "%~dp0"
echo.
echo SNS投稿管理ツールを起動します。
echo この黒い画面は閉じないでください。
echo.
echo 1. 本番用ビルドを作成しています...
call npm run build
if errorlevel 1 (
  echo.
  echo ビルドに失敗しました。表示されたエラーを確認してください。
  pause
  exit /b 1
)
echo.
echo 2. http://localhost:3002 で起動します。
echo ブラウザで http://localhost:3002 を開いてください。
echo.
call npm run start -- -p 3002
echo.
echo サーバーが停止しました。
pause
