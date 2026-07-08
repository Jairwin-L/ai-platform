import type { PrismaClient } from '../../generated/prisma/client';

const thirdPartyServicesData = [
  {
    value: 'tinypng',
    label: 'TinyPNG',
    apiKeyUrl: 'https://tinypng.com/developers',
    enabled: true,
  },
  {
    value: 'stripe',
    label: 'Stripe',
    apiKeyUrl: 'https://dashboard.stripe.com/apikeys',
    enabled: true,
  },
  {
    value: 'github',
    label: 'GitHub',
    apiKeyUrl: 'https://github.com/settings/tokens',
    enabled: true,
  },
];

export async function seedThirdPartyServices(prisma: PrismaClient): Promise<void> {
  console.log('Seeding third-party services...');

  const seedResults = await Promise.allSettled(
    thirdPartyServicesData.map(
      (service, index) => prisma.$executeRaw`
      INSERT INTO third_party_services (value, label, api_key_url, enabled, sort_order)
      VALUES (
        ${service.value},
        ${service.label},
        ${service.apiKeyUrl},
        ${service.enabled},
        ${index}
      )
      ON CONFLICT (value) DO UPDATE
      SET label = EXCLUDED.label,
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

  console.log(`Seeded ${thirdPartyServicesData.length} third-party services.`);
}
