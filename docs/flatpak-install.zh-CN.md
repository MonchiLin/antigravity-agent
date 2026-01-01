# Flatpak 版本安装指南

本文档介绍如何在 Linux 发行版上安装 Antigravity Agent 的 Flatpak 版本。

## 1. 准备工作

首先，你需要确保你的系统已经安装了 Flatpak 并添加了 Flathub 仓库。

> 关于如何在你的特定发行版（Ubuntu, Fedora, Arch, Debian 等）上开启 Flatpak 支持，请参考官方指南：
> 👉 **https://flatpak.org/setup/**

简单来说，大多数系统只需要执行以下命令（以 Ubuntu/Debian 为例）：

```bash
# 1. 安装 Flatpak
sudo apt install flatpak

# 2. 添加 Flathub 官方仓库
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# 3. 重启系统（建议）确保环境变量生效
```

## 2. 安装 Antigravity Agent

我们提供了直接安装包，你可以从 GitHub Releases 页面下载。

### 方式一：命令行安装（推荐）

打开终端，执行以下命令下载并安装最新版本（以 Nightly 构建为例）：

```bash
# 1. 下载 .flatpak 包
# 请前往 https://github.com/MonchiLin/antigravity-agent/releases 下载最新版本的 flatpak 文件
wget https://github.com/MonchiLin/antigravity-agent/releases/download/<version>/antigravity-agent_amd64.flatpak

# 2. 安装应用
flatpak install --user ./antigravity-agent_amd64.flatpak

# 注意：安装过程中可能会提示需要下载 GNOME 运行时（约 400MB），请输入 'y' 确认。
```

### 方式二：双击安装

如果你的系统集成了图形化软件中心（如 GNOME Software 或 KDE Discover）并支持 Flatpak：

1. 下载 `antigravity-agent_amd64.flatpak` 文件。
2. 双击文件，按照提示点击"安装"。

## 3. 运行应用

安装完成后，你可以通过应用菜单启动 **Antigravity Agent**，或者在终端运行：

```bash
flatpak run com.antigravity_agent.app
```

## 4. 更新与卸载

### 更新
当你下载了新版本的 `.flatpak` 文件时，再次运行安装命令即可更新：
```bash
flatpak install --user ./新版本的包名.flatpak
```

### 卸载
如果需要移除应用：
```bash
flatpak uninstall com.antigravity_agent.app
```

## 常见问题

**Q: 安装时下载速度慢？**
A: Flatpak 需要下载运行时环境（Runtime）。你可以尝试修改 Flathub 为国内镜像源（如上海交大源）来加速基础环境的下载。

**Q: 启动后无法点击或显示异常？**
A: 请确保你的系统显卡驱动正常。如果是虚拟机环境，请确保开启了 3D 加速。

**Q: 提示 "需要的运行时 org.gnome.Platform/x86_64/48 未找到"？**
A: 这说明你的系统没有配置 Flathub 仓库，无法自动下载依赖环境。请执行以下命令添加仓库：
```bash
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```
添加完成后，重新运行安装命令即可。
