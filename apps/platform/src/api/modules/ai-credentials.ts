import { alovaDelete, alovaGet, alovaPost } from '@/api/alova';

export type AiCredential = IApiAiCredentials.AiCredential;
export type AiCredentialListResponse = IApiAiCredentials.AiCredentialListResponse;
export type AiCredentialProvider = IApiAiCredentials.AiCredentialProvider;
export type AiCredentialStatus = IApiAiCredentials.AiCredentialStatus;
export type AiCredentialTtlOption = IApiAiCredentials.AiCredentialTtlOption;
export type AiProviderOption = IApiAiCredentials.AiProviderOption;
export type SaveAiCredentialPayload = IApiAiCredentials.SaveAiCredentialPayload;

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
