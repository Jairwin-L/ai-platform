import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';

/**
 * 管理端登录密码的 RSA 加密传输：
 * - 服务启动时在内存中生成一对 2048 位密钥，不依赖任何环境变量，也不落盘
 * - /auth/login-public-key 下发公钥，登录时用同一对私钥解密
 * - 前端 WebCrypto RSA-OAEP(SHA-256) 加密，后端使用对应参数解密
 *
 * 多实例部署时各实例密钥不同，前端拿公钥与提交登录可能落到不同实例上解密失败；
 * 管理端遇到解密失败会回退明文（仍走 HTTPS），不影响登录。
 */
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export function getLoginRsaPublicKey(): string {
  return publicKey;
}

export function decryptLoginPassword(encryptedBase64: string): string {
  const buffer = Buffer.from(encryptedBase64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Encrypted password is empty');
  }
  const decrypted = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  );
  return decrypted.toString('utf8');
}
