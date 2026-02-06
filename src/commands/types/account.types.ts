
// Antigravity 账户响应结构
export interface AntigravityAccount {
  antigravityAuthStatus: AntigravityAuthStatus
  oauthToken: OAuthTokenDecoded | null
  userStatus: UserStatusDecoded | null
}

export interface OAuthTokenDecoded {
  sentinelKey: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expirySeconds: number | null
}

export type UserStatusDecoded = UserStatusProtoDecoded

export interface UserStatusProtoDecoded {
  sentinelKey: string
  rawDataType: 'proto'
  rawData: UserStatusProtoRawData
}

export interface UserStatusProtoRawData {
  status: number
  plan_name: string
  email: string
  models: UserStatusModels | null
  plan: UserStatusPlan | null
}

export interface UserStatusModels {
  items: UserStatusModelItem[]
  recommended: UserStatusRecommended | null
  default_model: UserStatusDefaultModel | null
}

export interface UserStatusModelItem {
  name: string
  id: UserStatusModelId | null
  field_5: number
  field_11: number
  meta: UserStatusModelMeta | null
  tag: string
  supported_types: UserStatusSupportedType[]
}

export interface UserStatusModelMeta {
  rate_limit: number
  timestamp: UserStatusMetaTimestamp | null
}

export interface UserStatusMetaTimestamp {
  value: number
}

export interface UserStatusSupportedType {
  mime_type: string
  enabled: number
}

export interface UserStatusRecommended {
  category: string
  list: UserStatusRecommendedList | null
}

export interface UserStatusRecommendedList {
  model_names: string[]
}

export interface UserStatusDefaultModel {
  model: UserStatusModelId | null
}

export interface UserStatusModelId {
  id: number
}

export interface UserStatusPlan {
  tier_id: string
  tier_name: string
  display_name: string
  upgrade_url: string
  upgrade_message: string
}

// 原 Antigravity 账户信息（现作为内部字段）
// 根据实际 API 返回调整：不再包含 auth/context 嵌套结构，而是直接包含 info
export interface AntigravityAuthStatus {
  apiKey: string
  email: string
  name: string
  userStatusProtoBinaryBase64?: string
}

// 对应 Rust 的 AccountMetrics 结构
export interface QuotaItem {
  model_name: string;
  percentage: number;
  reset_text: string;
}

export interface AccountMetrics {
  email: string;
  user_id: string;
  avatar_url: string;
  quotas: QuotaItem[];
}
