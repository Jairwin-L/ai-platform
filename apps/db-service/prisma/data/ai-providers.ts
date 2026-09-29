import type { PrismaClient } from '../../generated/prisma/client';

interface SeedAiProvider {
  apiKeyUrl: string;
  chatBaseUrl: string;
  enabled: boolean;
  label: string;
  models: string[];
  protocol: 'chat-completions' | 'generate-content' | 'messages';
  value: string;
}

const aiProvidersData: SeedAiProvider[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    protocol: 'chat-completions',
    chatBaseUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4.1-mini'],
    enabled: true,
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    apiKeyUrl: 'https://platform.claude.com/settings/keys',
    protocol: 'messages',
    chatBaseUrl: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-5-haiku-latest'],
    enabled: true,
  },
  {
    value: 'gemini',
    label: 'Gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    protocol: 'generate-content',
    chatBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-2.5-flash'],
    enabled: true,
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    protocol: 'chat-completions',
    chatBaseUrl: 'https://api.deepseek.com/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    enabled: true,
  },
  {
    value: 'kimi',
    label: 'Kimi',
    apiKeyUrl: 'https://platform.kimi.ai/console/api-keys',
    protocol: 'chat-completions',
    chatBaseUrl: 'https://api.moonshot.ai/v1/chat/completions',
    models: ['kimi-k2.7-code', 'kimi-k2.7-code-highspeed', 'kimi-k2.6', 'kimi-k2.5'],
    enabled: true,
  },
];

export async function seedAiProviders(prisma: PrismaClient): Promise<void> {
  console.log('Seeding AI providers...');

  const seedResults = await Promise.allSettled(
    aiProvidersData.map(
      (provider, index) => prisma.$executeRaw`
      INSERT INTO ai_providers (
        value,
        label,
        api_key_url,
        protocol,
        chat_base_url,
        models,
        enabled,
        sort_order
      )
      VALUES (
        ${provider.value},
        ${provider.label},
        ${provider.apiKeyUrl},
        ${provider.protocol},
        ${provider.chatBaseUrl},
        ${provider.models},
        ${provider.enabled},
        ${index}
      )
      ON CONFLICT (value) DO UPDATE
      SET label = EXCLUDED.label,
          api_key_url = EXCLUDED.api_key_url,
          protocol = EXCLUDED.protocol,
          chat_base_url = EXCLUDED.chat_base_url,
          models = EXCLUDED.models,
          enabled = EXCLUDED.enabled,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
    `,
    ),
  );
  const failedSeed = seedResults.find((result) => result.status === 'rejected');

  if (failedSeed?.status === 'rejected') {
    throw failedSeed.reason;
  }

  console.log(`Seeded ${aiProvidersData.length} AI providers.`);
}
