import type sharp from 'sharp';

const MAX_DIM = 4096;
const TARGET_BYTES = 0.4 * 1024 * 1024;
const INITIAL_QUALITY = 75;
const MIN_QUALITY = 30;
const QUALITY_STEP = 5;

/** 初始质量之后依次尝试的档位（从高到低）：70, 65, …, 30 */
const FALLBACK_QUALITIES = Array.from(
  { length: (INITIAL_QUALITY - MIN_QUALITY) / QUALITY_STEP },
  (_, index) => INITIAL_QUALITY - QUALITY_STEP * (index + 1),
);

type SharpOutputType = 'jpeg' | 'png' | 'webp' | 'avif';

/** 压缩前后格式保持一致：输入什么格式就按什么格式编码，其余格式原样返回 */
const OUTPUT_TYPE_BY_MIME: Record<string, SharpOutputType> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const OUTPUT_MIME: Record<SharpOutputType, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

async function loadSharp(): Promise<typeof sharp> {
  return (await import('sharp')).default;
}

/**
 * 在初始质量不达标时，从剩余档位里找满足目标体积的最高质量。
 * 质量越低体积越小（大体单调），二分最多再编码 4 次；全部超标时返回最低质量的结果。
 */
async function searchQuality(
  encode: (quality: number) => Promise<Buffer>,
  initial: Buffer,
): Promise<Buffer> {
  let low = 0;
  let high = FALLBACK_QUALITIES.length - 1;
  let best: Buffer | null = null;
  let lowestTried = initial;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    // eslint-disable-next-line no-await-in-loop -- 二分查找必须按上一次的结果决定下一档
    const data = await encode(FALLBACK_QUALITIES[mid]);
    if (data.length <= TARGET_BYTES) {
      best = data;
      high = mid - 1;
    } else {
      lowestTried = data;
      low = mid + 1;
    }
  }

  return best ?? lowestTried;
}

export async function compressWithSharp(
  input: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string }> {
  const sharpFn = await loadSharp();
  const metadata = await sharpFn(input).metadata();
  const outputType = Object.hasOwn(OUTPUT_TYPE_BY_MIME, mime) ? OUTPUT_TYPE_BY_MIME[mime] : null;

  // 动图逐帧重编码开销大，按静态图处理又只剩第一帧；无法按原格式编码的类型也不转换，都原样返回。
  // 前端拿到不小于原图的结果会直接改用原图上传
  if (!outputType || (metadata.pages ?? 1) > 1) {
    return { data: input, mime };
  }

  const outputMime = OUTPUT_MIME[outputType];
  const pipeline = sharpFn(input)
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });

  const initial = await pipeline
    .clone()
    .toFormat(outputType, { quality: INITIAL_QUALITY })
    .toBuffer();
  if (initial.length <= TARGET_BYTES) {
    return { data: initial, mime: outputMime };
  }

  // 需要降质量时，先把解码、转正方向、缩放后的像素落下来，之后每个档位只重新编码
  const { data: pixels, info } = await pipeline.clone().raw().toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: info.channels };
  const data = await searchQuality(
    (quality) => sharpFn(pixels, { raw }).toFormat(outputType, { quality }).toBuffer(),
    initial,
  );

  return { data, mime: outputMime };
}
