import type sharp from 'sharp';

const MAX_DIM = 4096;
const TARGET_BYTES = 0.4 * 1024 * 1024;
const INITIAL_QUALITY = 75;
const MIN_QUALITY = 30;
const QUALITY_STEP = 5;

type SharpInstance = IServer.SharpInstance;
type SharpOutputType = IServer.SharpOutputType;

async function loadSharp(): Promise<typeof sharp> {
  return (await import(/* webpackIgnore: true */ 'sharp')).default;
}

async function createOutput(
  pipeline: SharpInstance,
  outputType: SharpOutputType,
  quality: number,
): Promise<Buffer> {
  return pipeline.clone().toFormat(outputType, { quality }).toBuffer();
}

async function compressToTargetBytes(
  pipeline: SharpInstance,
  outputType: SharpOutputType,
  quality: number,
): Promise<Buffer> {
  const data = await createOutput(pipeline, outputType, quality);
  if (data.length <= TARGET_BYTES || quality <= MIN_QUALITY) {
    return data;
  }

  return compressToTargetBytes(pipeline, outputType, quality - QUALITY_STEP);
}

export async function compressWithSharp(
  input: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string }> {
  const sharpFn = await loadSharp();
  const isPng = mime === 'image/png';
  const outputType: SharpOutputType = isPng ? 'png' : 'jpeg';
  const outputMime = isPng ? 'image/png' : 'image/jpeg';

  const pipeline = sharpFn(input).rotate().resize({
    width: MAX_DIM,
    height: MAX_DIM,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const data = await compressToTargetBytes(pipeline, outputType, INITIAL_QUALITY);

  return { data, mime: outputMime };
}
