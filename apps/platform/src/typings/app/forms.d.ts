declare namespace IAppForms {
  interface PasswordSignInValues {
    email: string;
    password: string;
  }

  interface CodeSignInValues {
    code: string;
    email: string;
  }

  interface SignUpValues {
    code: string;
    email: string;
    password: string;
  }

  interface SettingsValues {
    allowRegistration: boolean;
    byokAllowedOrigins: string;
    defaultLanguage: 'en-US' | 'zh-CN';
    displayName: string;
    maintenanceMode: boolean;
    sessionPolicy: 'standard' | 'strict';
    supportEmail?: string;
  }

  interface ProviderOptionsValues {
    aiProviderOptions: IApiAdmin.AiProviderOption[];
  }

  interface ThirdPartyServiceOptionsValues {
    thirdPartyServiceOptions: IApiAdmin.ThirdPartyServiceOption[];
  }

  interface UserFormValues {
    bio?: string;
    full_name?: string;
    nick_name?: string;
    roleIds?: number[];
    status: IApiUsers.UserStatus;
    user_name?: string;
  }

  interface ProfileFormValues {
    bio?: string;
    nick_name?: string;
  }

  interface CredentialFormValues {
    apiKey: string;
    label: string;
    provider: IApiAiCredentials.AiCredentialProvider;
    ttlOption: IApiAiCredentials.AiCredentialTtlOption;
  }

  interface ThirdPartyServiceCredentialFormValues {
    apiKey: string;
    label: string;
    serviceName: string;
    ttlOption: IApiThirdPartyServiceCredentials.CredentialTtlOption;
  }

  interface PermissionFormValues {
    code: string;
    description?: string;
    name: string;
    parent_id?: string;
    type: IApiAdmin.PermissionType;
  }

  interface RoleFormValues {
    description?: string;
    is_system?: boolean;
    name: string;
    permissions?: string[];
  }
}
