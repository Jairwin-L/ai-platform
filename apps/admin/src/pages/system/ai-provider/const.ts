/** 与 db-service 的 AI Provider 协议一一对应 */
export const PROVIDER_PROTOCOL_OPTIONS: Array<{
  label: string;
  value: IApiAdmin.AiProviderOption['protocol'];
}> = [
  { label: 'Chat Completions', value: 'chat-completions' },
  { label: 'Messages', value: 'messages' },
  { label: 'Generate Content', value: 'generate-content' },
];

export function getProtocolLabel(protocol: string): string {
  return PROVIDER_PROTOCOL_OPTIONS.find((item) => item.value === protocol)?.label ?? protocol;
}
