---
title: Git 进阶实战：实习中常遇到的冲突、变基与撤销
date: 2026-11-05 17:36:00
categories:
  - 技术开发
tags:
  - Git
  - 进阶教程
  - 团队协作
cover: https://images.unsplash.com/photo-1623520333087-62b8793e3d23?auto=format&fit=crop&w=1600&q=85
---

会提交代码之后，真正的协作问题才慢慢出现：代码写到一半需要切任务，拉取时遇到冲突，提交说明写错了，或者需要把某个修复带到另一个分支。

这篇是我的 Git 进阶笔记。建议先在练习仓库尝试，操作团队分支前先看清 `git status`，再确认团队约定。

<!-- more -->

## fetch 和 pull 有什么区别

`git fetch` 下载远程更新，并更新本地的远程跟踪分支，不会自动把它们合并进当前分支：

```bash
git fetch origin
git log --oneline --graph --decorate --all
```

`git pull` 会先获取更新，再按配置进行合并或变基。想先观察远程变化时，我通常先执行 `fetch`，再决定如何整合。

## 临时保存未完成的修改

正在写功能，突然需要切去处理其他任务，可以使用 stash：

```bash
git stash push -u -m "登录功能进行中"
git stash list
```

`-u` 会包含未跟踪文件，默认不会包含被忽略的文件。任务处理完成后，回到原分支，先查看再恢复：

```bash
git stash show -p stash@{0}
git stash apply stash@{0}
```

`apply` 会保留这条 stash，确认恢复成功后可以执行 `git stash drop stash@{0}` 删除。恢复时也可能发生冲突，按照提示处理即可。Windows PowerShell 中可将 `stash@{0}` 用引号包起来。

## 解决合并冲突

当两个分支修改了同一处内容，Git 可能无法自动判断最终版本。合并停止后，先执行：

```bash
git status
```

打开冲突文件，通常能看到类似下面的标记：

```text
<<<<<<< HEAD
当前分支的内容
=======
合并进来的内容
>>>>>>> feature/login
```

与相关同事确认需要保留的内容，删除标记并保存。然后暂存解决后的文件，并完成合并：

```bash
git add 冲突文件
git merge --continue
```

如果决定取消这次尚未完成的合并，可以使用 `git merge --abort`。解决前先检查状态和已有修改，避免误以为所有冲突都已处理。

## rebase：整理自己的功能分支

假设团队允许在自己的功能分支上变基，可以先获取远程更新，再把功能分支的提交重新应用到最新的 `origin/main` 上：

```bash
git fetch origin
git switch feature/login
git rebase origin/main
```

遇到冲突时，编辑并保存文件，然后：

```bash
git add 冲突文件
git rebase --continue
```

如果需要取消整个变基过程，使用 `git rebase --abort`。

变基会重写被重新应用的提交。已经与其他人共享的分支，先和团队确认再操作。`main`、`develop` 等共享分支尤其要遵守项目规则。

## 整理尚未共享的提交

例如最近三个提交都属于同一个功能，可以在自己的分支上使用交互式变基：

```bash
git rebase -i HEAD~3
```

编辑器会列出这三个提交。保留第一个提交的 `pick`，把需要合并进前一个提交的行改成 `squash`，保存退出后再按提示编辑提交说明。开始前确认这三个提交存在，并确认没有其他人依赖它们的原提交历史。

## 修改最近一次提交

刚提交完，发现漏了一个文件，可以把文件暂存后补进最近一次提交：

```bash
git add 漏掉的文件
git commit --amend --no-edit
```

只想修改最近一次提交说明时，使用 `git commit --amend`。这会生成新的提交，适合处理尚未共享的提交。

## 已经推送的错误提交

如果一个错误提交已经被团队使用，通常可以使用 `revert` 创建一条反向提交，保留原有历史：

```bash
git log --oneline
git revert 提交哈希
```

执行后检查结果并按团队流程推送。涉及合并提交时，`revert` 需要指定主线父提交，先确认团队处理方式。

## 把单个修复带到当前分支

有时只需要另一个分支上的某一次修复，可以先查看提交，再使用 cherry-pick：

```bash
git show 提交哈希
git cherry-pick 提交哈希
```

它会把该提交的变更应用到当前分支并生成新提交。若发生冲突，解决并 `git add` 后执行 `git cherry-pick --continue`。需要放弃时可以执行 `git cherry-pick --abort`。

## 推送被拒绝时

推送被拒绝不一定是权限问题，也可能是远程分支已有新提交。先读取错误信息，再检查状态和远程历史：

```bash
git status
git fetch origin
git log --oneline --graph --decorate --all
```

在自己的功能分支上重写历史后，团队可能允许使用 `git push --force-with-lease`。它会检查远程引用是否仍符合本地预期，降低覆盖他人更新的风险，但依然会改写远程历史。执行前先确认分支归属、团队规则和远程状态。

## 找回线索

如果发现分支指针移动到了意料之外的位置，可以先查看本地引用记录：

```bash
git reflog
```

记下相关提交哈希，用 `git show 提交哈希` 检查内容。确定要恢复什么之后，再选择创建新分支等方式保存现场。reflog 是本地记录，不能保证永久保留所有历史。

## 我给自己的协作习惯

每次操作前先确认分支，提交前看差异，遇到不认识的提示先停下来读。修改共享历史、处理复杂冲突或准备覆盖远程分支时，及时和团队沟通。

参考：[Git 参考手册](https://git-scm.com/docs)、[git-rebase](https://git-scm.com/docs/git-rebase)、[git-stash](https://git-scm.com/docs/git-stash)、[git-revert](https://git-scm.com/docs/git-revert)。
