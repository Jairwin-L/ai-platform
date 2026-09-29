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

  interface ResetPasswordValues {
    code: string;
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

  type ProviderOptionValues = IApiAdmin.AiProviderOption;

  interface ThirdPartyServiceOptionsValues {
    thirdPartyServiceOptions: IApiAdmin.ThirdPartyServiceOption[];
  }

  type ThirdPartyServiceOptionValues = IApiAdmin.ThirdPartyServiceOption;

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
}
