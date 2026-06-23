import { createSuccessResponse, withApiHandler } from '@/lib/server';

/**
 * @openapi
 * /api/demo:
 *   get:
 *     tags:
 *       - Demo
 *     summary: Get demo greeting
 *     responses:
 *       200:
 *         description: 示例问候语返回成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [code, success, message, data, timestamp]
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hello
 *                 data:
 *                   $ref: '#/components/schemas/DemoData'
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 */
export const GET = withApiHandler(async () => createSuccessResponse('Hello', '请求成功'));
