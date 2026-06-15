import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { COMMON_ERROR, FILE_ERROR, createErrorResponse, withApiHandler } from '@/lib/server';
import type { ApiHandler } from '@/lib/server/types';
import { compressWithSharp } from '@/lib/server/image-compress';

export const runtime = 'nodejs';

const SHARP_SUPPORTED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * @openapi
 * /api/compress/sharp:
 *   post:
 *     tags:
 *       - Compress
 *     summary: Compress an image with sharp
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
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No file provided or unsupported file type
 *       500:
 *         description: Compression failed
 */
const sharpHandler: ApiHandler = async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'No file provided', null, 400);
  }

  if (!SHARP_SUPPORTED_MIME_TYPES.has(file.type)) {
    return createErrorResponse(
      FILE_ERROR.TYPE_NOT_SUPPORTED,
      `Sharp compression does not support this file type: ${file.type || 'unknown'}`,
      null,
      400,
    );
  }

  try {
    const source = Buffer.from(await file.arrayBuffer());
    const { data, mime } = await compressWithSharp(source, file.type);

    return new NextResponse(new Blob([new Uint8Array(data)], { type: mime }), {
      status: 200,
      headers: { 'Content-Type': mime },
    });
  } catch (error) {
    return createErrorResponse(
      FILE_ERROR.COMPRESS_FAILED,
      error instanceof Error ? error.message : 'Compression failed',
      error,
      500,
    );
  }
};

export const POST = withApiHandler(sharpHandler);
