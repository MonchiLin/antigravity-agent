# Antigravity 1.5.6 版本说明

## ⚠️ 重要变更：鉴权凭证结构升级

为了同步 Antigravity (>=1.16.5) 的最新核心变更，Antigravity Agent 本次更新**不再支持旧版本的凭证数据结构**。

这意味着您之前保存的账户凭证将失效，**您需要重新登录所有账户**。

## 🔄 新的凭证保存机制

同时，Antigravity 修改了底层的凭证保存逻辑，现在**仅在程序关闭时将凭证写入磁盘**。

因此，在您登录新账户后，**必须手动关闭一次 Antigravity**（完全退出进程），Antigravity Agent 才能成功捕获并保存您的账户信息。

> **总结的操作步骤**：
> 1. 更新 Antigravity Agent 至最新版。
> 2. 重新登录您的 Antigravity 账户。
> 3. **关闭 Antigravity** 以触发保存。

---

# Antigravity 1.5.6 Version Note

## ⚠️ Important Change: Credential Structure Upgrade

To align with the latest core changes in Antigravity (>=1.16.5), this update of Antigravity Agent **no longer supports the legacy credential data structure**.

This means that your previously saved account credentials will become invalid, and **you need to log in to all your accounts again**.

## 🔄 New Credential Persistence Mechanism

Simultaneously, Antigravity has modified its underlying credential persistence logic, and now **writes credentials to disk only when the program closes**.

Therefore, after logging into a new account, **you must manually close Antigravity once** (completely exit the process) for Antigravity Agent to successfully capture and save your account information.

> **Summary of Steps**:
> 1. Update Antigravity Agent to the latest version.
> 2. Log in to your Antigravity account again.
> 3. **Close Antigravity** to trigger saving.
