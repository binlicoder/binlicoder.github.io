---
title: Linux 日常管理实战｜从 useradd 到共享目录和定时归档
date: 2026-11-19 18:01:22
categories:
  - 技术开发
tags:
  - Linux
  - SSH
  - 系统管理
cover: /img/linux-useradd-teamshare.webp
---

新同事需要上服务器更新项目资料。给她开一个独立的账号，让她用自己的 SSH 密钥登录，再通过用户组开放一个共享目录。最后，把共享目录的日常归档交给定时任务。这个流程可以直接用在小团队的开发机上。

示例使用 Ubuntu 或 Debian，管理员已有 `sudo` 权限。账号叫 `alice`，项目组叫 `siteops`，新建的共享目录是 `/srv/teamshare`。命令里的 `server.example.com` 换成自己的服务器地址。

<!-- more -->

## 用 useradd 建账号，用 usermod 给权限

先检查账号和组名是否已被使用。全新环境中，这两条查询都没有输出。已有项目组可以直接复用。

```bash
getent passwd alice
getent group siteops
```

```bash
sudo groupadd siteops
sudo useradd -m -U -s /bin/bash alice
sudo passwd alice
sudo usermod -aG siteops alice
id alice
sudo -iu alice id
```

- `-m` 创建家目录，`-U` 创建同名主组，`-s` 指定登录 Shell。可以用 `getent passwd alice` 查看实际家目录和 Shell。
- `passwd` 在终端里交互式设置账号密码。SSH 是否接受密码认证由服务端策略决定，本文后面使用公钥。
- `usermod -aG` 将 `siteops` 加到现有附加组中。单用 `-G` 会**替换**整份附加组列表，可能把原有访问权限一起去掉。
- `id alice` 查当前账号记录，`sudo -iu alice id` 验证新会话里的实际组身份。已经打开的 SSH 会话需要重新登录才会读取新的组列表。

只给共享目录授权时，把账号加入项目组就够了。 [useradd 手册](https://manpages.ubuntu.com/manpages/noble/man8/useradd.8.html) · [usermod 手册](https://man7.org/linux/man-pages/man8/usermod.8.html)

## 让共享目录里的新文件可协作

在支持 ACL 的文件系统上创建一个新目录。若 `setfacl` 尚未安装，先运行 `sudo apt update` 和 `sudo apt install acl`。

```bash
sudo install -d -o root -g siteops -m 2770 /srv/teamshare
sudo setfacl -m d:u::rwx,d:g::rwx,d:o::--- /srv/teamshare
sudo getfacl -p /srv/teamshare
```

`2770` 里的 `770` 允许目录属主和属组进入、读写。前面的 `2` 设置 setgid，保证新文件和子目录继承 `siteops`。默认 ACL 决定新对象继承哪些访问权限。应用如果特意用 `0600` 创建私密文件，ACL 仍会受这个创建模式限制。对于已有目录，先检查属主、属组和 ACL，再决定怎么迁移已有文件。 [Linux ACL 手册](https://manpages.ubuntu.com/manpages/noble/man5/acl.5.html)

创建一个文件和一个子目录，看结果是否符合预期。

```bash
sudo -iu alice sh -c 'touch /srv/teamshare/alice-demo.txt && mkdir -p /srv/teamshare/release'
sudo stat -c '%A %U:%G %n' /srv/teamshare/alice-demo.txt /srv/teamshare/release
sudo getfacl -p /srv/teamshare/alice-demo.txt
```

新文件应显示属组 `siteops`，并具有组读写权限。子目录的权限字符串中，组执行位通常会显示 `s`。共享目录的组写权限也允许成员重命名或删除目录里其他成员的文件，因此适合可以互相维护资料的项目组。

## 配置 SSH 公钥并实际登录一次

请 Alice 在自己的电脑上生成一对密钥。生成时可设置口令来保护私钥。

```bash
install -d -m 700 "$HOME/.ssh"
ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519_teamshare"
ssh-keygen -lf "$HOME/.ssh/id_ed25519_teamshare.pub"
```

只把 `.pub` 文件交给管理员，私钥留在 Alice 的电脑上。假设管理员已经将收到的公钥保存到服务器管理员家目录的 `alice-teamshare.pub`，先核对指纹，再追加到账号的授权文件。

```bash
ssh-keygen -lf "$HOME/alice-teamshare.pub"
sudo -u alice install -d -m 0700 /home/alice/.ssh
sudo -u alice sh -c 'umask 077; { printf "\n"; cat; } >> "$1" && chmod 600 "$1"' \
  sh /home/alice/.ssh/authorized_keys < "$HOME/alice-teamshare.pub"
```

如果 `getent passwd alice` 显示的家目录不同，换成实际路径。追加方式会保留已有公钥。保留当前管理员连接，让 Alice 从另一个终端测试。

```bash
ssh -o IdentitiesOnly=yes -i "$HOME/.ssh/id_ed25519_teamshare" alice@server.example.com
id
ls -ld /srv/teamshare
```

登录后用 `id` 确认会话有 `siteops` 权限。上述路径适用于默认的 `authorized_keys` 配置。 [OpenSSH 服务端手册](https://man.openbsd.org/sshd.8#FILES)

## 用 rsync 发布文件，先看变更再同步

假设 Alice 的电脑上有个 `./dist/` 目录，电脑和服务器都装了 `rsync`。先预演一次，看看哪些文件会更新。

```bash
rsync -rtvi --dry-run --omit-dir-times --chmod='ug=rwX,o=' \
  -e "ssh -o IdentitiesOnly=yes -i '$HOME/.ssh/id_ed25519_teamshare'" \
  ./dist/ alice@server.example.com:/srv/teamshare/release/
```

`./dist/` 末尾的斜杠表示同步目录里的内容。`-i` 会逐项显示变更，`--chmod` 让新建的发布文件适合组内协作，已有文件通常沿用接收端的权限。确认源目录和目标目录后，去掉 `--dry-run` 执行。这个示例会更新同名文件，并保留目标端独有的文件。 [rsync 手册](https://download.samba.org/pub/rsync/rsync.1)

## 用 crontab 每晚归档一次

先以 Alice 身份登录服务器。归档只需要读取项目目录，所以用普通用户自己的 `crontab`。服务器需要已启用 Cron 服务，且 Alice 能读取要归档的文件。

```bash
install -d -m 700 "$HOME/.local/teamshare-tools" "$HOME/teamshare-backups"
nano "$HOME/.local/teamshare-tools/archive.sh"
```

把下面的脚本保存到 `archive.sh`。它先写临时文件，打包成功后才放到正式位置。同一天再跑会更新当天的归档，文件锁让手动运行与定时任务不会同时写入。

```sh
#!/bin/sh
set -eu
PATH=/usr/bin:/bin
umask 077

backup_dir="$HOME/teamshare-backups"
exec 9>"$backup_dir/.archive.lock"
flock -n -E 75 9 || {
  status=$?
  [ "$status" -eq 75 ] && exit 0
  exit "$status"
}

today=$(date +%F)
tmp=$(mktemp "$backup_dir/.teamshare.XXXXXX")
trap 'rm -f -- "$tmp"' EXIT
tar -czf "$tmp" -C /srv teamshare
mv -f -- "$tmp" "$backup_dir/teamshare-$today.tar.gz"
```

先手动执行并查看归档内容，然后再安排时间。

```bash
chmod 700 "$HOME/.local/teamshare-tools/archive.sh"
"$HOME/.local/teamshare-tools/archive.sh"
tar -tzf "$HOME/teamshare-backups/teamshare-$(date +%F).tar.gz"
crontab -e
```

在 Alice 的个人 crontab 中加入下面这一行。每天按服务器本地时间的 02:30 执行，输出和错误都写入同一个日志。

```cron
30 2 * * * "$HOME/.local/teamshare-tools/archive.sh" >> "$HOME/teamshare-backups/cron.log" 2>&1
```

保存后用 `crontab -l` 确认。个人 crontab 的五个时间字段后面直接写命令；日期格式中的 `%` 放在脚本里，可避免被 cron 当成换行。归档会随日期累积，按项目的保留周期定期整理即可。 [crontab 手册](https://manpages.debian.org/trixie/cron/crontab.5.en.html) · [flock 手册](https://man7.org/linux/man-pages/man1/flock.1.html)

## 项目交接时移出用户组

如果 Alice 还需要保留账号，只撤掉对这个项目的组权限。

```bash
sudo gpasswd -d alice siteops
id alice
```

组权限变更在新会话中生效，已有进程可能仍持有原来的组身份。交接时也要检查该账号的定时任务和归档去向。若还要回收 SSH 登录权限，检查账户策略及公钥授权。`passwd -l` 锁住的是密码，公钥仍可能有效。 [gpasswd 手册](https://man7.org/linux/man-pages/man1/gpasswd.1.html) · [passwd 手册](https://man7.org/linux/man-pages/man1/passwd.1.html)
