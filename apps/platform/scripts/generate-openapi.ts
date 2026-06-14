import fs from 'node:fs';
import path from 'node:path';
import { createSwaggerSpec } from 'next-swagger-doc';
import { openApiDefinition } from '../src/lib/swagger';

async function generate() {
  console.log('Generating OpenAPI specification...');

  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: openApiDefinition,
  });

  const outputDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');

  console.log('OpenAPI spec generated successfully.');
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

generate().catch((error) => {
  console.error('Failed to generate OpenAPI spec:');
  console.error(error);
  process.exit(1);
});
