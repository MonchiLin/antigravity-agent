# Flatpak Installation Guide

This document describes how to install the Flatpak version of Antigravity Agent on Linux distributions.

## 1. Preparation

First, ensure that Flatpak is installed on your system and the Flathub repository is added.

> For instructions on enabling Flatpak support on your specific distribution (Ubuntu, Fedora, Arch, Debian, etc.), please refer to the official guide:
> 👉 **https://flatpak.org/setup/**

In short, for most systems (using Ubuntu/Debian as an example), you just need to run:

```bash
# 1. Install Flatpak
sudo apt install flatpak

# 2. Add the official Flathub repository
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# 3. Restart your system (recommended) to ensure environment variables take effect
```

## 2. Install Antigravity Agent

We provide a direct installation package which you can download from the GitHub Releases page.

### Method 1: Command Line Installation (Recommended)

Open a terminal and run the following commands to download and install the latest version:

```bash
# 1. Download the .flatpak package
# Please go to https://github.com/MonchiLin/antigravity-agent/releases to download the latest flatpak file
wget https://github.com/MonchiLin/antigravity-agent/releases/download/<version>/antigravity-agent_amd64.flatpak

# 2. Install the application
flatpak install --user ./antigravity-agent_amd64.flatpak

# Note: During installation, you might be prompted to download the GNOME Runtime (approx. 400MB). Please type 'y' to confirm.
```

### Method 2: Graphical Installation

If your system has a graphical software center (like GNOME Software or KDE Discover) with Flatpak support integrated:

1. Download the `antigravity-agent_amd64.flatpak` file.
2. Double-click the file and follow the prompts to "Install".

## 3. Run the Application

Once installed, you can launch **Antigravity Agent** from your application menu, or run it from the terminal:

```bash
flatpak run com.antigravity_agent.app
```

## 4. Update & Uninstall

### Update
When you download a newer version of the `.flatpak` file, run the install command again to update:
```bash
flatpak install --user ./new_version_package.flatpak
```

### Uninstall
To remove the application:
```bash
flatpak uninstall com.antigravity_agent.app
```

## FAQ

**Q: Download speed is slow during installation?**
A: Flatpak needs to download runtime environments. You can try changing Flathub to a local mirror to accelerate the download of basic environments.

**Q: Display issues or unclickable elements after startup?**
A: Please ensure your system's graphics drivers are working correctly. If running in a virtual machine, make sure 3D acceleration is enabled.

**Q: Error "runtime org.gnome.Platform/x86_64/48 not found"?**
A: This means your system is not configured with the Flathub repository, so it cannot automatically download dependencies. Please run the following command to add the repository:
```bash
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```
After adding it, run the installation command again.
