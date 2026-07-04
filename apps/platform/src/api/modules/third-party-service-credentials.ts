import { alovaDelete, alovaGet, alovaPost } from '@/api/alova';

export type CredentialStatus = IApiThirdPartyServiceCredentials.CredentialStatus;
export type CredentialTtlOption = IApiThirdPartyServiceCredentials.CredentialTtlOption;
export type SaveThirdPartyServiceCredentialPayload =
  IApiThirdPartyServiceCredentials.SaveThirdPartyServiceCredentialPayload;
export type ThirdPartyServiceOption = IApiThirdPartyServiceCredentials.ThirdPartyServiceOption;
export type ThirdPartyServiceCredential =
  IApiThirdPartyServiceCredentials.ThirdPartyServiceCredential;
export type ThirdPartyServiceCredentialListResponse =
  IApiThirdPartyServiceCredentials.ThirdPartyServiceCredentialListResponse;

export async function getThirdPartyServiceCredentials(): Promise<ThirdPartyServiceCredential[]> {
  return alovaGet<ThirdPartyServiceCredentialListResponse>('/user/third-party-service');
}

export async function getThirdPartyServiceOptions(): Promise<ThirdPartyServiceOption[]> {
  return alovaGet<ThirdPartyServiceOption[]>('/third-party-service/options');
}

export async function createThirdPartyServiceCredential(
  payload: SaveThirdPartyServiceCredentialPayload,
): Promise<ThirdPartyServiceCredential> {
  const response = await alovaPost<ThirdPartyServiceCredential & { saved: true }>(
    '/user/third-party-service',
    payload,
  );

  return response;
}

export async function deleteThirdPartyServiceCredential(credentialId: string): Promise<void> {
  await alovaDelete(`/user/third-party-service/${credentialId}`);
}
