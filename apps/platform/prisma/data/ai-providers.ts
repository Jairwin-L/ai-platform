import type { PrismaClient } from '../../generated/prisma/client';

const aiProvidersData = [
  {
    value: 'openai',
    label: 'OpenAI',
    color: 'blue',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    enabled: true,
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    color: 'purple',
    apiKeyUrl: 'https://platform.claude.com/settings/keys',
    enabled: true,
  },
  {
    value: 'gemini',
    label: 'Gemini',
    color: 'green',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    enabled: true,
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    color: 'geekblue',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    enabled: true,
  },
];

export async function seedAiProviders(prisma: PrismaClient): Promise<void> {
  console.log('Seeding AI providers...');

  const seedResults = await Promise.allSettled(
    aiProvidersData.map(
      (provider, index) => prisma.$executeRaw`
      INSERT INTO ai_providers (value, label, color, api_key_url, enabled, sort_order)
      VALUES (
        ${provider.value},
        ${provider.label},
        ${provider.color},
        ${provider.apiKeyUrl},
        ${provider.enabled},
        ${index}
      )
      ON CONFLICT (value) DO UPDATE
      SET label = EXCLUDED.label,
          color = EXCLUDED.color,
          api_key_url = EXCLUDED.api_key_url,
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
