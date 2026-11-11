#!/usr/bin/env bash
# 新建一篇文章，并把文件名规范成英文短名（决定文章 URL）
# 用法: ./new.sh "文章标题" 英文短名
# 例:   ./new.sh "Vim 入门笔记" vim-basics

set -e

TITLE="$1"
SLUG="$2"

if [ -z "$TITLE" ]; then
  echo "用法: ./new.sh \"文章标题\" 英文短名"
  echo "例:   ./new.sh \"Vim 入门笔记\" vim-basics"
  exit 1
fi

cd "$(dirname "$0")"

if [ -z "$SLUG" ]; then
  SLUG="post-$(date +%Y%m%d-%H%M)"
  echo "没有指定英文短名，先用 $SLUG 占位"
fi

# 只允许小写字母、数字、连字符，避免 URL 里出现奇怪字符
if ! echo "$SLUG" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "短名只能用「小写字母 / 数字 / 连字符」，例如 vim-basics"
  exit 1
fi

if [ -f "source/_posts/$SLUG.md" ]; then
  echo "source/_posts/$SLUG.md 已存在，换个短名"
  exit 1
fi

pnpm exec hexo new post "$TITLE" >/dev/null

# hexo 会按标题生成文件名，中文标题会得到中文文件名，这里改成短名
SRC=$(ls -t source/_posts/*.md | head -1)
mv "$SRC" "source/_posts/$SLUG.md"

TODAY=$(date +%Y/%m/%d)
echo "已创建  source/_posts/$SLUG.md"
echo "标题    $TITLE"
echo "地址    https://binlicoder.github.io/$TODAY/$SLUG/"
echo ""
echo "下一步：编辑文件 -> ./publish.sh \"补充说明\" 提交发布"
