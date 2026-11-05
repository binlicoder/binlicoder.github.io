---
title: macOS 上手 Homebrew：让软件安装和更新更简单
date: 2026-11-05 18:30:00
categories:
  - 技术开发
tags:
  - macOS
  - Homebrew
  - 开发工具
cover: https://images.unsplash.com/photo-1649451844897-8699a1d6d96d?auto=format&fit=crop&w=1600&q=85
---

换了一台 Mac，安装开发工具时，手动寻找下载地址、拖动安装包、逐个检查更新，很快就会变成一件重复的事。Homebrew 可以用几条终端命令管理这些软件，让环境搭建更有条理。

这篇文章从安装开始，记录日常最常用的 Homebrew 命令。

<!-- more -->

## Homebrew 是什么

Homebrew 是 macOS 上常用的软件包管理工具。它可以安装 Git、Node.js 等命令行工具，也可以通过 Cask 安装图形界面应用。

- **Formula** 通常用于命令行工具和开发依赖。
- **Cask** 用于安装预编译的软件，例如浏览器、编辑器和其他桌面应用。

## 安装前的准备

打开 macOS 自带的「终端」。如果系统还没有安装 Apple 命令行开发工具，可以运行：

```bash
xcode-select --install
```

按照系统提示完成安装。如果系统提示已经安装，就可以继续。

Homebrew 官方文档列出的当前支持环境是 macOS 15 或更新版本。Intel Mac 的支持级别和 Apple 芯片设备不同，使用较旧系统时可以先查看官方文档。

## 安装 Homebrew

在终端运行 Homebrew 官网提供的安装命令：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装脚本会说明即将执行的操作并等待确认。过程中可能要求输入 Mac 登录密码。终端输入密码时不会显示字符，输入完成后按回车即可。

安装结束后，留意终端里的 **Next steps**，按提示将 Homebrew 加入 shell 环境。Apple 芯片 Mac 常见的 zsh 配置命令如下：

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Intel Mac 默认安装路径通常是 `/usr/local`，应以安装器显示的命令为准。完成后检查版本：

```bash
brew --version
```

能看到版本号，就可以开始使用了。

## 搜索和查看软件

不知道软件包的准确名称时，可以先搜索：

```bash
brew search git
```

安装前查看软件说明、版本和相关信息：

```bash
brew info git
```

也可以访问 [Homebrew Formulae](https://formulae.brew.sh/) 搜索软件包。

## 安装命令行工具

例如安装 Git 和 wget：

```bash
brew install git wget
```

安装完成后，可以检查对应工具的版本：

```bash
git --version
wget --version
```

查看已安装的命令行软件包：

```bash
brew list --formula
```

## 安装图形应用

使用 `--cask` 可以安装图形界面应用。例如安装 Firefox：

```bash
brew install --cask firefox
```

查看已安装的 Cask 应用：

```bash
brew list --cask
```

软件包名称不一定和应用的展示名称完全一致，安装前可以用 `brew search` 和 `brew info --cask` 确认。

## 更新软件

先更新 Homebrew 的软件包信息，再查看哪些软件有新版本：

```bash
brew update
brew outdated
```

升级所有可升级的软件包：

```bash
brew upgrade
```

如果只想升级某个工具，可以指定名称：

```bash
brew upgrade git
```

部分应用可能有自己的更新机制。重要工具升级前，可以先查看更新内容，确认项目环境是否兼容。

## 卸载与清理

卸载命令行工具：

```bash
brew uninstall wget
```

卸载通过 Cask 安装的应用：

```bash
brew uninstall --cask firefox
```

查看可清理的旧版本和缓存，确认后再执行清理：

```bash
brew cleanup --dry-run
brew cleanup
```

## 遇到问题时

如果终端提示 `command not found: brew`，先确认安装是否成功，再检查安装器输出的 `brew shellenv` 配置是否已经加入当前 shell。

如果安装或更新出现问题，可以运行：

```bash
brew doctor
```

根据输出逐项检查。安装和更新依赖网络，网络连接不稳定时也可能导致下载失败。日常使用通常直接运行 `brew`，不需要在前面加 `sudo`。

## 常用命令速查

| 需求 | 命令 |
| --- | --- |
| 搜索软件 | `brew search 名称` |
| 查看信息 | `brew info 名称` |
| 安装工具 | `brew install 名称` |
| 安装图形应用 | `brew install --cask 名称` |
| 查看可更新项目 | `brew outdated` |
| 更新 Homebrew 信息 | `brew update` |
| 升级软件 | `brew upgrade` |
| 卸载工具 | `brew uninstall 名称` |
| 预览清理内容 | `brew cleanup --dry-run` |

## 参考资料

- [Homebrew 官网](https://brew.sh/)
- [Homebrew 安装文档](https://docs.brew.sh/Installation)
- [Homebrew 命令手册](https://docs.brew.sh/Manpage)
- 封面摄影：Bernd Dittrich / [Unsplash](https://unsplash.com/photos/a-laptop-computer-sitting-on-top-of-a-desk-jG-jFEyKnqY)
