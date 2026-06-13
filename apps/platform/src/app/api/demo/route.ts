import { createSuccessResponse, withApiHandler } from '@/lib/server';

export const GET = withApiHandler(async () => createSuccessResponse('Hello', 'Hello'));
