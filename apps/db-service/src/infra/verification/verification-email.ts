import { APP_NAME, VERIFICATION_CODE_TTL_SECONDS } from '@ai/constants';
import type { VerificationPurpose } from './verification-code.service';

const PURPOSE_TEXT: Record<VerificationPurpose, string> = {
  'sign-in': '登录账号',
  'sign-up': '注册账号',
  'reset-password': '重置密码',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 验证码邮件正文。有效期由 TTL 常量推导，不在文案里写死，改常量时不会出现文案对不上。
 */
export function buildVerificationCodeEmail(purpose: VerificationPurpose, code: string) {
  const purposeText = PURPOSE_TEXT[purpose];
  const minutes = Math.max(1, Math.round(VERIFICATION_CODE_TTL_SECONDS / 60));

  return {
    subject: `${APP_NAME} 邮箱验证码`,
    text: [
      `${APP_NAME} 验证码`,
      '',
      `你正在使用邮箱验证码${purposeText}。`,
      `验证码：${code}`,
      `验证码 ${minutes} 分钟内有效，请勿转发给他人。`,
      '如果不是你本人操作，可以忽略这封邮件。',
    ].join('\n'),
    html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
      <h2 style="margin:0 0 16px;">${escapeHtml(APP_NAME)} 验证码</h2>
      <p>你正在使用邮箱验证码${escapeHtml(purposeText)}。</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0;">${escapeHtml(code)}</p>
      <p>验证码 ${minutes} 分钟内有效，请勿转发给他人。</p>
      <p style="color:#6b7280;font-size:13px;">如果不是你本人操作，可以忽略这封邮件。</p>
    </div>
  `,
  };
}
