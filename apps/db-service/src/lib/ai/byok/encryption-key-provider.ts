export type EncryptionKeyProvider = IByok.EncryptionKeyProvider;

function getEnvEncryptionKey(version: string): Buffer {
  const envName = `AI_KEY_ENCRYPTION_KEY_${version.toUpperCase()}`;
  const raw = process.env[envName];

  if (!raw) {
    throw new Error(`${envName} 未配置`);
  }

  const key = Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    throw new Error(`${envName} Base64 解码后必须为 32 字节`);
  }

  return key;
}

export class EnvEncryptionKeyProvider implements EncryptionKeyProvider {
  async getActiveKey(): Promise<{ version: string; key: Buffer }> {
    return {
      version: 'v1',
      key: getEnvEncryptionKey('v1'),
    };
  }

  async getKeyByVersion(version: string): Promise<Buffer> {
    if (version !== 'v1') {
      throw new Error('不支持的 BYOK 加密密钥版本');
    }

    return getEnvEncryptionKey(version);
  }
}

export const envEncryptionKeyProvider = new EnvEncryptionKeyProvider();
