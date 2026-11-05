---
title: Git 基础入门：实习生带你走完第一次提交
date: 2026-11-05 17:35:00
categories:
  - 技术开发
tags:
  - Git
  - 入门教程
  - 开发工具
cover: https://images.unsplash.com/photo-1649451844897-8699a1d6d96d?auto=format&fit=crop&w=1600&q=85
---

刚开始实习时，我对 Git 的理解只有一句话：写完代码记得 `add`、`commit`、`push`。后来真正参与协作才发现，理解每一步在做什么，比背命令更重要。

这篇笔记会从零带你完成一次提交和推送。建议跟着创建一个练习目录，亲手操作一遍。

<!-- more -->

## 先认识 Git 和 GitHub

Git 用来记录文件的变化，帮助我们查看历史、创建分支和合并修改。GitHub 是托管 Git 仓库的平台，团队可以在上面协作。

本地仓库保存在自己的电脑上，远程仓库通常保存在 GitHub 等平台。你可以先在本地提交，再把提交推送到远程。

## 安装和首次配置

先在终端检查 Git 是否安装：

```bash
git --version
```

如果没有安装，可以到 [Git 官网](https://git-scm.com/downloads)下载安装。macOS 也可以用 Homebrew 安装 `git`。

第一次使用时设置提交者信息，把下面的内容换成自己的名字和邮箱：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

查看配置：

```bash
git config --global --list
```

这份配置会写进提交记录。若希望 GitHub 将提交关联到账号，请使用账号已验证的邮箱，或 GitHub 提供的隐私邮箱。

## 创建一个练习仓库

打开终端，输入：

```bash
mkdir git-practice
cd git-practice
git init -b main
```

`git init` 会在当前目录创建仓库。接着新建一个名为 `hello.txt` 的文本文件，写入一行内容并保存。你可以使用记事本、VS Code 或其他编辑器。

查看状态：

```bash
git status
```

这时 Git 会提示有未跟踪的文件。别担心，它只是在告诉你，仓库还没有开始记录这个文件。

## 工作区、暂存区和提交

可以把一次提交想成整理包裹。工作区是正在编辑的文件，暂存区是准备放进包裹的内容，提交则是保存一次快照。

```bash
git add hello.txt
git status
git commit -m "添加练习文件"
```

`git add` 把当前内容放入暂存区，`git commit` 将暂存区里的内容保存为一次提交。提交说明尽量写清楚做了什么，方便以后查找。

如果修改了多个文件，`git add .` 会暂存当前目录及其子目录的变化。提交前先用 `git status` 和 `git diff --staged` 检查，避免把不该提交的文件一起放进去。

## 查看修改和历史

修改 `hello.txt` 并保存，再执行：

```bash
git status
git diff
```

`git diff` 显示工作区与暂存区之间尚未暂存的差异。执行 `git add hello.txt` 后，可以用下面的命令查看准备提交的内容：

```bash
git diff --staged
git log --oneline
```

`git log --oneline` 会以精简形式列出提交历史。终端进入分页界面时，按 `q` 退出。

## 用分支开发一个功能

实习中接到新任务时，团队通常会要求在功能分支上开发。先确认当前所在分支，再创建新分支：

```bash
git branch
git switch -c feature/hello
```

修改文件、暂存并提交：

```bash
git add hello.txt
git commit -m "完善问候内容"
```

练习仓库中，可以切回 `main` 并合并这个分支：

```bash
git switch main
git merge feature/hello
```

团队项目的合并方式以项目约定为准，很多团队会通过 Pull Request 或 Merge Request 进行代码评审。

## 连接远程仓库并推送

先在 GitHub 创建一个空仓库，将下面的地址替换成你自己的仓库地址：

```bash
git remote add origin https://github.com/用户名/仓库名.git
git remote -v
git push -u origin main
```

`origin` 是远程仓库的常用名字，`-u` 会建立当前分支与远程分支的跟踪关系。后续在该分支上通常可以直接使用 `git push`。

GitHub 可能要求通过浏览器或凭据管理器完成认证，具体方式取决于本机配置。

如果项目已经存在，通常使用克隆，而不是重新初始化：

```bash
git clone https://github.com/用户名/仓库名.git
cd 仓库名
```

## 拉取最新代码

开始工作前，先确认自己所在的分支和工作区状态：

```bash
git status
git branch
```

在需要更新的分支上执行 `git pull`，Git 会获取远程更新并根据配置整合到当前分支。如果有未提交修改或出现冲突，先看清终端提示，再按团队流程处理。

## 不小心操作错了怎么办

刚刚执行了 `git add`，还没有提交，想把文件移出暂存区：

```bash
git restore --staged hello.txt
```

文件的工作区修改仍会保留。若想丢弃工作区中尚未暂存的修改，可以使用 `git restore hello.txt`，执行前先确认内容已经备份，这个操作会覆盖相应修改。

## 每次提交前，我会检查什么

1. 用 `git status` 确认分支和文件状态。
2. 用 `git diff` 查看修改，用 `git diff --staged` 检查即将提交的内容。
3. 确认没有提交密码、密钥、个人配置或生成文件。
4. 写清楚提交说明，再推送到正确的分支。

下一篇会继续整理冲突、暂存、变基和撤销提交这些实习中经常遇到的场景。

参考：[Pro Git 中文版](https://git-scm.com/book/zh/v2)、[Git 命令参考](https://git-scm.com/docs)。
