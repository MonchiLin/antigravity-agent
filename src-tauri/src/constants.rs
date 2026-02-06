/// 数据库字段常量
pub mod database {
    /// User Status（新版格式 >= 1.16.5）
    pub const USER_STATUS: &str = "antigravityUnifiedStateSync.userStatus";

    /// OAuth Token（新版格式 >= 1.16.5）
    pub const OAUTH_TOKEN: &str = "antigravityUnifiedStateSync.oauthToken";

    /// 认证状态
    pub const AUTH_STATUS: &str = "antigravityAuthStatus";

    /// 旧版字段，仅用于启动时识别旧备份并重命名为 `.json.old`
    pub const AGENT_STATE: &str = "jetskiStateSync.agentManagerInitState";
}
