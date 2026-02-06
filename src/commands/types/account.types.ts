// Antigravity account response
export interface AntigravityAccount {
  antigravity_auth_status: AntigravityAuthStatus
  oauth_token: OAuthTokenDecoded | null
  user_status: UserStatusDecoded | null
}

export interface AntigravityAuthStatus {
  api_key?: string
  email: string
  name?: string
  user_status_proto_binary_base64?: string
  [key: string]: unknown
}

export interface OAuthTokenDecoded {
  sentinel_key: string
  access_token: string
  refresh_token: string
  token_type: string
  expiry_seconds: number | null
}

export type UserStatusDecoded = UserStatusProtoDecoded

export interface UserStatusProtoDecoded {
  sentinel_key: string
  raw_data_type: 'proto' | string
  raw_data: UserStatusProtoRawData
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

export interface QuotaItem {
  model_name: string
  percentage: number
  reset_text: string
}

export interface AccountMetrics {
  email: string
  user_id: string
  avatar_url: string
  quotas: QuotaItem[]
}

export interface TriggerResult {
  email: string
  triggered_models: string[]
  failed_models: string[]
  skipped_models: string[]
  skipped_details: string[]
  success: boolean
  message: string
}

export interface CommandResult {
  ok: boolean
  code: string
  message: string
  details?: unknown
}
