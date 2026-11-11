#!/usr/bin/env bash
# 一键发布：本地构建检查 -> 提交 -> 推送 source 分支 -> GitHub Actions 自动上线
# 用法: ./publish.sh "这次改了什么"

set -e

cd "$(dirname "$0")"

MSG="${1:-更新博客内容}"

echo "[1/3] 本地构建检查"
if ! pnpm exec hexo generate >/tmp/hexo-build.log 2>&1; then
  echo "构建失败，先别发。错误如下："
  tail -20 /tmp/hexo-build.log
  exit 1
fi
echo "      构建通过"

echo "[2/3] 检查改动"
git add -A
if git diff --cached --quiet; then
  echo "      没有需要提交的改动"
  exit 0
fi
git status --short

echo "[3/3] 提交并推送"
git commit -q -m "$MSG"
GIT_TERMINAL_PROMPT=0 git push origin source

echo ""
echo "已推送。约 1~2 分钟后自动上线："
echo "https://binlicoder.github.io/"
echo "进度可看：https://github.com/binlicoder/binlicoder.github.io/actions"
