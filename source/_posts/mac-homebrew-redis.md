---
title: 在 Mac 上用 Homebrew 安装 Redis
date: 2026-11-22 04:41:32
---
# 在 Mac 上用 Homebrew 安装 Redis

本指南适用于使用 zsh 的 Apple Silicon Mac。本机的 Homebrew 已安装在 `/opt/homebrew`，可以直接从第一步开始。

配置完成后，Redis 会在后台运行。关闭终端窗口后仍可连接，Mac 重启后，登录 macOS 账户时会自动启动。以后的日常用法是打开任意新终端，输入 `redis-cli`。

## 1. 安装 Redis

在 macOS 终端中逐行运行下面的命令。

```zsh
brew --version
brew install redis
command -v redis-cli
redis-cli --version
```

安装包同时提供服务端 `redis-server` 和客户端 `redis-cli`。最后两条命令应分别显示客户端路径 `/opt/homebrew/bin/redis-cli` 和版本。若遇到 `command not found`，按第 4 节修复路径，再回到这里。 [Homebrew Redis 安装说明](https://formulae.brew.sh/formula/redis)

## 2. 启动服务并设置登录时自动启动

如果以前用 Docker 跑过 Redis，可以先用下面的命令检查默认的 `6379` 端口是否已被占用。

```zsh
lsof -nP -iTCP:6379 -sTCP:LISTEN
```

有输出时，先确认是哪一个进程占用了端口，再决定用哪个实例。端口空闲后，直接用自己的 macOS 账户运行下列命令。

```zsh
brew services start redis
brew services info redis
redis-cli -h 127.0.0.1 -p 6379 PING
```

看到服务处于运行状态，且最后一条命令返回 `PONG`，就可以开始使用。用户级服务由 macOS 管理，会在该账户登录后启动。 [Redis 的 macOS 安装指南](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-mac-os/) · [Homebrew 服务命令](https://docs.brew.sh/Manpage)

## 3. 验证新终端可以直接使用

关闭当前终端窗口，再打开一个新的，运行下面两条命令。

```zsh
redis-cli PING
redis-cli
```

第一行应返回 `PONG`。第二行进入 Redis 交互界面，出现 `127.0.0.1:6379>` 后，可以输入下面的命令。

```redis
PING
QUIT
```

`QUIT` 退出客户端并回到终端，后台服务继续运行。读写数据的例子见同目录下的 [Redis 使用指南](<02 - Redis 使用指南.md>)。 [Redis CLI 官方文档](https://redis.io/docs/latest/develop/tools/cli/)

## 4. 新终端找不到 brew 或 redis-cli 时

先运行下面的命令，在当前终端加载 Homebrew 路径。

```zsh
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
```

要让以后打开的登录终端也识别 Homebrew，用 `nano ~/.zprofile` 打开配置文件。如果已有等效的 `brew shellenv` 配置，保留一份即可。否则加入下面这一行，按 **Ctrl+O**、**回车** 保存，再按 **Ctrl+X** 退出。

```zsh
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
```

打开新终端，先用 `command -v brew` 验证路径。Redis 装好后，再用 `command -v redis-cli` 验证客户端路径。如果你在编辑器里使用的是非登录 zsh，且那里仍找不到命令，可把同一行放进那个 shell 会读取的 `~/.zshrc`。 [Homebrew 的 shellenv 文档](https://docs.brew.sh/Manpage)

## 常用管理命令

| 想做什么 | 在 macOS 终端输入 |
| --- | --- |
| 查看服务状态 | `brew services info redis` |
| 重启 Redis | `brew services restart redis` |
| 停止服务并取消登录自启 | `brew services stop redis` |
| 再次启动并启用登录自启 | `brew services start redis` |
| 查看最近的服务日志 | `tail -n 50 "$(brew --prefix)/var/log/redis.log"` |

如果 `redis-cli PING` 返回 `Connection refused`，先查服务状态，再看日志。如果日志显示端口冲突，用第 2 节的 `lsof` 命令找到监听者。Docker Desktop 正在运行时，也可用 `docker ps --format 'table {{.Names}}\t{{.Ports}}'` 查看是否有容器把端口映射到本机的 `6379`。

Homebrew 服务的配置文件在 `$(brew --prefix)/etc/redis.conf`，默认数据目录在 `$(brew --prefix)/var/db/redis`。本机开发使用默认的本地监听地址即可。 [Homebrew Redis 配方与服务配置](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/r/redis.rb)a
