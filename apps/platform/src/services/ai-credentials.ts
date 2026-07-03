import { alovaDelete, alovaGet, alovaPost } from '@/utils/alova';

export type AiCredentialProvider = 'anthropic' | 'deepseek' | 'gemini' | 'openai';
export type AiCredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';
export type AiCredentialTtlOption = '2w' | '3w' | '4w' | '7d';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AiCredential {
  credentialId: string;
  expiresAt: string;
  keyHint: string;
  label: string;
  lastUsedAt?: string;
  provider: AiCredentialProvider;
  remainingSeconds: number;
  status: AiCredentialStatus;
}

export interface SaveAiCredentialPayload {
  apiKey: string;
  label: string;
  provider: AiCredentialProvider;
  ttlOption: AiCredentialTtlOption;
}

export interface AiProviderOption {
  color: string;
  label: string;
  value: AiCredentialProvider;
}

interface AiCredentialListResponse {
  credentials: AiCredential[];
}

function assertApiResponse<T>(response: unknown): ApiResponse<T> {
  const result = response as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.message || '请求失败');
  }

  return result;
}

export async function getAiCredentials(): Promise<AiCredential[]> {
  const response = await alovaGet<AiCredentialListResponse>('/api/user/ai-credentials');

  return response.credentials;
}

export async function getAiProviderOptions(): Promise<AiProviderOption[]> {
  const response = await alovaGet('/api/ai/provider-options');

  return assertApiResponse<AiProviderOption[]>(response).data;
}

export async function createAiCredential(payload: SaveAiCredentialPayload): Promise<AiCredential> {
  const response = await alovaPost<AiCredential & { saved: true }>(
    '/api/user/ai-credentials',
    payload,
  );

  return response;
}

export async function deleteAiCredential(credentialId: string): Promise<void> {
  await alovaDelete(`/api/user/ai-credentials/${credentialId}`);
}
