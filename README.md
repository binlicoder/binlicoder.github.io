# 落笔之间

这是博客的 Hexo 源码。`source` 分支保存文章、配置和主题样式，`main` 分支由 Hexo 发布，供 GitHub Pages 展示。

## 在新电脑上开始

1. 安装 Git、Node.js 22（22.17.1 或更新的 22.x 版本）和 pnpm。
2. 克隆源码分支，并安装依赖。

```bash
git clone --branch source --single-branch https://github.com/binlicoder/binlicoder.github.io.git blog
cd blog
corepack enable
pnpm install --frozen-lockfile
```

如果系统没有 Corepack，可按 pnpm 官方安装文档安装 pnpm 11。确认 `node --version` 显示 22.17.1 或更新的 22.x 版本。

3. 预览博客。

```bash
pnpm exec hexo server
```

浏览器访问终端显示的地址，通常为 `http://localhost:4000/`。按 Ctrl+C 停止预览。

## 写文章与发布

```bash
pnpm exec hexo new "文章标题"
```

在 `source/_posts/` 中编辑生成的 Markdown 文件。完成后，先检查并备份源码。

```bash
git status
git add .
git commit -m "新增文章"
git push origin source
```

然后生成并发布网站。

```bash
pnpm exec hexo generate
pnpm exec hexo deploy
```

发布需要有 GitHub 仓库写入权限，并在新电脑上完成 Git 身份与 GitHub 登录配置。切换电脑开始写作之前，在 `source` 分支执行 `git pull --ff-only origin source` 获取最新源码。不要直接在 `main` 分支编辑源码，发布过程会更新该分支的网页文件。

文章图片可放在 `source/img/`，在 Markdown 中用 `/img/文件名` 引用。生成目录 `public/`、依赖目录 `node_modules/` 和部署缓存 `.deploy_git/` 由工具重新生成，不纳入源码提交。播放器使用参考站点的远程音频地址，访问情况取决于该站点。
