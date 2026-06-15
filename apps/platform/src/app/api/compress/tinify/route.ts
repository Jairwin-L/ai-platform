import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import tinify from 'tinify';
import { COMMON_ERROR, FILE_ERROR, createErrorResponse, withApiHandler } from '@/lib/server';
import type { ApiHandler } from '@/lib/server/types';

export const runtime = 'nodejs';

const TINIFY_SUPPORTED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getTinifyErrorStatus(error: unknown): number {
  if (error instanceof tinify.AccountError) return 429;
  if (error instanceof tinify.ClientError) return 400;
  if (error instanceof tinify.ServerError) return 503;
  if (error instanceof tinify.ConnectionError) return 502;

  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status <= 599) {
    return status;
  }

  return 500;
}

async function compressWithTinify(
  input: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string }> {
  const apiKey = process.env.TINYPNG_API_KEY;
  if (!apiKey || apiKey === 'change-me') {
    throw new Error('TinyPNG API key is not configured');
  }

  tinify.key = apiKey;
  const result = await tinify.fromBuffer(input as unknown as Uint8Array).toBuffer();
  const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result);

  return { data: buffer, mime };
}

/**
 * @openapi
 * /api/compress/tinify:
 *   post:
 *     tags:
 *       - Compress
 *     summary: Compress an image with TinyPNG
 *     description: Returns a compressed binary image. Error path returns standard JSON error.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Compressed image binary
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No file provided, unsupported file type, or TinyPNG rejected the image
 *       429:
 *         description: TinyPNG account quota or API key issue
 *       502:
 *         description: Failed to connect to TinyPNG
 *       503:
 *         description: TinyPNG service error
 *       500:
 *         description: Compression failed
 */
const tinifyHandler: ApiHandler = async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'No file provided', null, 400);
  }

  if (!TINIFY_SUPPORTED_MIME_TYPES.has(file.type)) {
    return createErrorResponse(
      FILE_ERROR.TYPE_NOT_SUPPORTED,
      `TinyPNG does not support this file type: ${file.type || 'unknown'}`,
      null,
      400,
    );
  }

  try {
    const source = Buffer.from(await file.arrayBuffer());
    const { data, mime } = await compressWithTinify(source, file.type);

    return new NextResponse(new Blob([new Uint8Array(data)], { type: mime }), {
      status: 200,
      headers: { 'Content-Type': mime },
    });
  } catch (error) {
    return createErrorResponse(
      FILE_ERROR.COMPRESS_FAILED,
      error instanceof Error ? error.message : 'Compression failed',
      error,
      getTinifyErrorStatus(error),
    );
  }
};

export const POST = withApiHandler(tinifyHandler);
