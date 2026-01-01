
// Antigravity 当前用户信息类型
export interface AntigravityAccount {
  auth: Auth
  context: Context
  f11_base64: string
  f18_base64: string
  f7_base64: any
  f9_base64: string
  flags_f5_base64: string
  history: any[]
  user_id_raw_base64: string
}

interface Auth {
  access_token: string
  id_token: string
  meta: Meta
  type: string
}

interface Meta {
  expiry_timestamp: number
}

interface Context {
  email: string
  models: Models
  plan: Plan
  plan_name: string
  status: number
}

interface Models {
  items: Item[]
  recommended: Recommended
  unknown_f3_base64: string
}

interface Item {
  name: string
  unknown_f11: number
  unknown_f15_base64: string
  unknown_f2_base64: string
  unknown_f5: number
}

interface Recommended {
  names: string[]
  unknown_f2_base64: string
}

interface Plan {
  description: string
  name: string
  slug: string
  upgrade_msg: string
  upgrade_url: string
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
