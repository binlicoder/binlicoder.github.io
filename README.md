# 落笔之间

博客的 Hexo 源码。`source` 分支保存文章、配置和样式，`main` 分支存放编译后的网页，由 GitHub Pages 展示。

**只有 `source` 分支是能编辑的**，`main` 会被自动发布流程覆盖，不要手动改。

## 换电脑：三步恢复

源码全部在 GitHub 上，本机的任何文件夹都可以丢，只要记得仓库地址。

### 1. 装环境

- **Git**：https://git-scm.com/downloads
- **Node.js 22**（22.17.1 或更新的 22.x）：https://nodejs.org/
- **pnpm**（10 或更新版本）：装完 Node 后执行 `corepack enable` 即可，无需单独安装

检查是否就绪：

```bash
node --version    # 应显示 v22.x
pnpm --version    # 应显示 10.x 或更高
git --version
```

### 2. 拉源码

```bash
git clone --branch source --single-branch https://github.com/binlicoder/binlicoder.github.io.git blog
cd blog
pnpm install --frozen-lockfile
```

`--branch source` 不能省。不加这个参数会克隆到 `main` 分支——那里面全是编译好的 HTML 和 CSS，没有 Markdown 源文件，也没法用来写文章。

### 3. 验证

```bash
pnpm exec hexo server
```

浏览器打开 `http://localhost:4000/`，能看到博客就说明环境完全正常。按 `Ctrl+C` 停止。

主题（Butterfly）是通过 npm 安装的，不需要单独克隆主题仓库。文章图片在仓库的 `source/img/` 里，也会一起拉下来。

## 日常写文章

```bash
./new.sh "文章标题" english-slug
```

第二个参数是英文短名，**它决定文章的 URL**，只能用小写字母、数字和连字符。中文标题会变成 `%E5%85%A5%E9%97%A8` 这种编码地址，所以必须给英文短名。

```bash
# 例：得到 source/_posts/vim-basics.md
./new.sh "Vim 入门笔记" vim-basics
```

编辑生成的 Markdown 文件，文章开头的字段：

| 字段 | 说明 |
| --- | --- |
| `title` | 文章标题 |
| `date` | 发布时间，写未来时间则暂时不生成 |
| `categories` | 分类，选一个：技术开发 / 生活随笔 |
| `tags` | 标签，可写多个，影响标签云 |
| `cover` | 封面图，填 `/img/xxx.png` 或图片链接 |
| `description` | 摘要，搜索结果里显示这句 |

正文用 `<!-- more -->` 分隔导语和正文，它上面的一段会作为首页卡片摘要。

## 发布

```bash
./publish.sh "新增 Vim 笔记"
```

脚本会自动：本地构建检查 → 提交 → 推送 `source`。构建失败会直接中止，不会把坏页面推上线。

推送成功后 GitHub Actions 自动编译并更新 `main`，**约 1~2 分钟**线上生效。查看进度：https://github.com/binlicoder/binlicoder.github.io/actions

推送需要 GitHub 写入权限。Windows 上首次推送时，Git Credential Manager 会弹窗要求登录 GitHub，登录一次后自动记住。

不要用 `hexo deploy`：发布已经由 `.github/workflows/publish-blog.yml` 接管，手动 deploy 会和自动流程同时抢 `main` 分支。

## 换电脑前

如果旧电脑上还有没推送的修改，先推上去，否则会丢：

```bash
git status              # 确认有没有未提交的改动
./publish.sh "收尾"      # 有改动就先推
```

推完就可以换机器了，新电脑上按上面「三步恢复」走一遍即可。

新电脑第一次执行 `./new.sh` 如果提示 `Permission denied`，说明克隆时没保留可执行位（少见，多见于从压缩包解压的副本），执行一次 `chmod +x *.sh` 即可。

## 其他说明

- 生成目录 `public/`、依赖目录 `node_modules/`、部署缓存 `.deploy_git/` 都是工具产物，不纳入提交。
- `core.autocrlf` 在 Windows 上默认开启，`.gitattributes` 已把 `*.sh`、`*.yml` 固定为 LF，脚本换机器也不会因为换行符报错。
- 音乐播放器用的是参考站点的远程音频地址，播放是否正常取决于对方服务器。
