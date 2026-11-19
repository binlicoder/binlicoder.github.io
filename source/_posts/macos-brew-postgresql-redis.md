---
title: macOS 用 Homebrew 本地部署 PostgreSQL 和 Redis
date: 2026-11-19 17:50:22
categories:
  - 技术开发
tags:
  - macOS
  - Homebrew
  - PostgreSQL
  - Redis
cover: /img/macos-brew-postgresql-redis.webp
---

在 Mac 上开发一个待办事项应用，通常会用 PostgreSQL 保存任务，用 Redis 缓存查询结果。用 Homebrew 可以在本机启动这两个服务，然后用终端完成从建库到缓存读写的整套流程。

下面用 PostgreSQL 18 和 Homebrew 的 `redis` 包演示。数据库和缓存都运行在这台 Mac 上，项目通过 `127.0.0.1` 连接。

<!-- more -->

## 安装和启动服务

先运行 `brew --version`。如果终端找不到 `brew`，可以先看 [macOS 上手 Homebrew](/2026/11/05/macos-homebrew-guide/) 配好环境。

```bash
brew install postgresql@18 redis
```

为了让终端优先找到 PostgreSQL 18 的命令，把它的 `bin` 目录放到 `PATH` 前面。`brew --prefix` 会给出当前 Mac 上的安装路径。

```bash
export PATH="$(brew --prefix postgresql@18)/bin:$PATH"
psql --version
redis-cli --version
```

这行 `export` 对当前终端窗口生效。日常使用 zsh 的话，可以把它添加到 `~/.zshrc`，以后打开终端就能直接用 `psql`。

```bash
brew services start postgresql@18
brew services start redis
brew services list
```

`start` 会立即启动服务，也会注册为当前用户登录时自动启动。只想临时跑一次，可以在服务尚未启动时用 `brew services run postgresql@18` 或 `brew services run redis`。这两个命令的用法见 [Homebrew 服务管理文档](https://docs.brew.sh/Manpage#services-subcommand)。

接着用客户端探测一下端口。

```bash
pg_isready -h 127.0.0.1 -p 5432
redis-cli -h 127.0.0.1 -p 6379 PING
```

PostgreSQL 显示 `accepting connections`、Redis 返回 `PONG`，就可以继续配置。`pg_isready` 检查的是服务能否接收连接，后面还要用项目账号登录一次。安装包信息见 [PostgreSQL 18 Formula](https://formulae.brew.sh/formula/postgresql%4018) 和 [Redis 的 macOS 安装文档](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/homebrew/)。

## PostgreSQL 建库、建用户和练习 SQL

全新安装时，Homebrew 会初始化 PostgreSQL 的数据目录。用安装它的 macOS 用户打开终端，进入默认的 `postgres` 数据库。已有实例可以使用自己的数据库管理员账号。

```bash
psql -d postgres
```

进入 `psql` 后，给练习项目建一个登录角色和一个独立的数据库。执行 `\password` 时，按提示输入两次自己选的密码。

```sql
CREATE ROLE app_user LOGIN;
SET password_encryption = 'scram-sha-256';
\password app_user
CREATE DATABASE app_demo OWNER app_user;
\q
```

### 让项目连接验证密码

给角色设置密码以后，实际是否验证还取决于 `pg_hba.conf`。初始化时生成的规则可能允许本机走 `trust`。先查配置文件的位置。

```bash
psql -d postgres -c 'SHOW hba_file;'
```

用编辑器打开输出的文件，把下面这行放到会匹配本机连接的通用 `host` 规则之前。PostgreSQL 按文件里的顺序使用第一条匹配规则，这行只针对 `app_user` 通过 IPv4 回环地址连接 `app_demo` 的情况。规则顺序见 [PostgreSQL 客户端认证文档](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)。

```text
host    app_demo    app_user    127.0.0.1/32    scram-sha-256
```

保存后重新加载配置，再按项目实际会用的方式登录。出现密码提示时，输入刚才设置的密码。

```bash
psql -d postgres -c 'SELECT pg_reload_conf();'
psql -h 127.0.0.1 -p 5432 -U app_user -d app_demo
```

### 新建一条待办

进到 `app_demo` 后，可以先用 `\conninfo` 确认当前账号和数据库，再执行下列 SQL。

```sql
CREATE TABLE IF NOT EXISTS todos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL UNIQUE,
  done boolean NOT NULL DEFAULT false
);

INSERT INTO todos (title)
VALUES ('Learn local PostgreSQL')
ON CONFLICT (title) DO NOTHING;

SELECT id, title, done FROM todos ORDER BY id;

UPDATE todos
SET done = true
WHERE title = 'Learn local PostgreSQL'
RETURNING id, title, done;
```

最后一条语句会返回这条待办，`done` 显示为 `t`。用 `\dt` 查看当前可见的表，用 `\q` 退出。想把练习库导出到当前目录，可以回到终端运行下面两条命令。`pg_restore --list` 会列出归档中的对象，方便先检查备份。 [PostgreSQL 导出文档](https://www.postgresql.org/docs/18/app-pgdump.html)

```bash
pg_dump -h 127.0.0.1 -p 5432 -U app_user -d app_demo -Fc -f app_demo.dump
pg_restore --list app_demo.dump
```

## Redis 读写和设置过期时间

在终端连接 Redis。接下来几条大写命令都在 `redis-cli` 里执行。

```bash
redis-cli -h 127.0.0.1 -p 6379
```

```text
PING
SET demo:todos:summary '{"completed":1}' EX 120
GET demo:todos:summary
TTL demo:todos:summary
DEL demo:todos:summary
GET demo:todos:summary
QUIT
```

`SET ... EX 120` 把示例 JSON 当作字符串保存，120 秒后自动过期。趁它还有效时执行 `GET` 会读到值，`TTL` 会显示剩余秒数。`TTL` 返回 `-1` 表示键没有设置过期时间，`-2` 表示键已不存在。执行 `DEL` 以后再次 `GET`，通常会看到 `(nil)`。 [Redis SET 文档](https://redis.io/docs/latest/commands/set/)，[Redis TTL 文档](https://redis.io/docs/latest/commands/ttl/)

把它接进项目时，可以先查 Redis。缓存没有结果，就查 PostgreSQL，再把结果写入 Redis 并设置过期时间。更新待办时，先提交 PostgreSQL 事务，再删除对应的 Redis 键，让下一次读取重新生成缓存。这样即使缓存过期，应用也能从数据库读到原始记录。

## 项目连接参数

| 配置 | PostgreSQL | Redis |
| --- | --- | --- |
| 主机 | `127.0.0.1` | `127.0.0.1` |
| 端口 | `5432` | `6379` |
| 数据库 | `app_demo` | `0` |
| 用户 | `app_user` | 默认配置可留空 |
| 密码 | `\password` 设置的密码 | 按本机 Redis 配置填写，默认可留空 |

把数据库密码放在项目的本地环境变量或未纳入 Git 的本地配置里。两项服务都保留在回环地址上，应用和服务在同一台 Mac 就能直接通信。 [Redis 网络安全文档](https://redis.io/docs/latest/operate/oss_and_stack/management/security/#network-security)

## 常见问题和日常管理

- **`psql: command not found` 或版本不对**。重新执行前面的 `export PATH=...`，再用 `command -v psql` 和 `psql --version` 确认当前终端使用的是 PostgreSQL 18。
- **`role does not exist` 或 `database does not exist`**。初始化时的管理员通常与安装 PostgreSQL 的 macOS 用户同名。首次进入时显式指定 `psql -d postgres`，项目连接时则明确指定 `-U app_user -d app_demo`。
- **PostgreSQL 连得上却没提示密码**。先确认用了 `-h 127.0.0.1`，再核对 `pg_hba.conf` 中 SCRAM 规则的位置，以及修改后是否执行了 `pg_reload_conf()`。客户端如果已配置密码文件，也可能自动提供密码。
- **连接被拒绝或服务启动失败**。先看 `brew services info postgresql@18` 或 `brew services info redis`，再查端口是否被 Docker、其他 PostgreSQL 实例或已有 Redis 进程占用。

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:6379 -sTCP:LISTEN
```

不用时可以停止服务，下次用前再启动。`stop` 也会取消相应的登录自启动注册。

```bash
brew services stop postgresql@18
brew services stop redis
```
