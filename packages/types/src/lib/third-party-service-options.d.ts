declare namespace IThirdPartyServiceOptions {
  interface ServiceOption {
    apiKeyUrl?: string;
    enabled: boolean;
    label: string;
    value: string;
  }

  type EnabledServiceOption = Omit<ServiceOption, 'enabled'>;

  interface ServiceOptionRow {
    api_key_url: string | null;
    enabled: boolean;
    label: string;
    sort_order: number;
    value: string;
  }
}
