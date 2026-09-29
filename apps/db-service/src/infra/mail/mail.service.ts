import { Injectable } from '@nestjs/common';
import { APP_NAME } from '@ai/constants';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

interface ResendApiResponse {
  id?: string;
  message?: string;
  name?: string;
  error?: { message?: string; name?: string };
}

/** 不需要加引号的显示名字符集，与 RFC 5322 的 atom 口径一致 */
const PLAIN_DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 _.-]+$/;

/**
 * 拼发件人显示名：剔除会撑破邮件头的字符（换行、引号、尖括号），
 * 中文等非 atom 字符加引号，否则会被部分 MTA 判成非法头。
 */
function formatDisplayName(name: string): string {
  const safe = name.replace(/["<>\r\n]/g, '').trim() || APP_NAME;
  return PLAIN_DISPLAY_NAME_PATTERN.test(safe) ? safe : `"${safe}"`;
}

function getRequiredEnv(name: 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 未配置`);
  }
  return value;
}

/**
 * 发信服务：只走 Resend。密钥与发件地址全部来自环境变量，仓库里不出现任何真实地址。
 */
@Injectable()
export class MailService {
  async sendEmail({ to, subject, html, text }: SendEmailParams) {
    const apiKey = getRequiredEnv('RESEND_API_KEY');
    const fromEmail = getRequiredEnv('RESEND_FROM_EMAIL');
    const from = `${formatDisplayName(process.env.RESEND_FROM_NAME ?? '')} <${fromEmail}>`;

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    const data = (await response.json().catch(() => ({}))) as ResendApiResponse;

    if (!response.ok || data.error) {
      const reason = data.error?.message || data.message || data.name || '验证码邮件发送失败';
      throw new Error(`Resend ${response.status}: ${reason}`);
    }

    return data.id ? { id: data.id } : null;
  }
}
