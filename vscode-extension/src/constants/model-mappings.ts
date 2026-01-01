export const MODEL_QUOTA_MAPPING: Record<string, string> = {
    'Gemini 3 Pro (High)': 'Gemini Pro',
    'Gemini 3 Pro (Low)': 'Gemini Pro',
    'Gemini 3 Flash': 'Gemini Flash',
    'Claude Sonnet 4.5': 'Claude',
    'Claude Sonnet 4.5 (Thinking)': 'Claude',
    'Claude Opus 4.5 (Thinking)': 'Claude',
    'GPT-OSS 120B (Medium)': 'Claude',
};

export const UNKNOWN_QUOTA = 'Unknown';

export function getQuotaCategory(modelName: string): string {
    return MODEL_QUOTA_MAPPING[modelName] || UNKNOWN_QUOTA;
}
