import { alovaDelete, alovaGet, alovaPost } from '@/api/alova';

export type AiCredentialProvider = 'anthropic' | 'deepseek' | 'gemini' | 'openai';
export type AiCredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';
export type AiCredentialTtlOption = '2w' | '3w' | '4w' | '7d';

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

export async function getAiCredentials(): Promise<AiCredential[]> {
  const response = await alovaGet<AiCredentialListResponse>('/user/ai-credentials');

  return response.credentials;
}

export async function getAiProviderOptions(): Promise<AiProviderOption[]> {
  return alovaGet<AiProviderOption[]>('/ai/provider-options');
}

export async function createAiCredential(payload: SaveAiCredentialPayload): Promise<AiCredential> {
  const response = await alovaPost<AiCredential & { saved: true }>('/user/ai-credentials', payload);

  return response;
}

export async function deleteAiCredential(credentialId: string): Promise<void> {
  await alovaDelete(`/user/ai-credentials/${credentialId}`);
}
