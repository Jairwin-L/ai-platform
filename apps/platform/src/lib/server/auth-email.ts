import { APP_NAME } from '@/constants';
import type { AuthCodePurpose } from './auth-verification';

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY 未配置');
  }

  return apiKey;
}

function getResendFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL 未配置');
  }

  return fromEmail;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPurposeText(purpose: AuthCodePurpose): string {
  if (purpose === 'sign-up') {
    return '注册账号';
  }

  if (purpose === 'reset-password') {
    return '重置密码';
  }

  return '登录账号';
}

function buildVerificationEmailHtml(code: string, purpose: AuthCodePurpose): string {
  const escapedCode = escapeHtml(code);
  const escapedPurpose = escapeHtml(getPurposeText(purpose));

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
      <h2 style="margin:0 0 16px;">${escapeHtml(APP_NAME)} 验证码</h2>
      <p>你正在使用邮箱验证码${escapedPurpose}。</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0;">${escapedCode}</p>
      <p>验证码 1 分钟内有效，请勿转发给他人。</p>
      <p style="color:#6b7280;font-size:13px;">如果不是你本人操作，可以忽略这封邮件。</p>
    </div>
  `;
}

function buildVerificationEmailText(code: string, purpose: AuthCodePurpose): string {
  return [
    `${APP_NAME} 验证码`,
    '',
    `你正在使用邮箱验证码${getPurposeText(purpose)}。`,
    `验证码：${code}`,
    '验证码 1 分钟内有效，请勿转发给他人。',
    '如果不是你本人操作，可以忽略这封邮件。',
  ].join('\n');
}

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  purpose: AuthCodePurpose,
): Promise<void> {
  const from = `${APP_NAME} <${getResendFromEmail()}>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${APP_NAME} 邮箱验证码`,
      html: buildVerificationEmailHtml(code, purpose),
      text: buildVerificationEmailText(code, purpose),
    }),
  });
  const payload = (await response.json()) as IServer.ResendEmailResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || '验证码邮件发送失败');
  }
}
