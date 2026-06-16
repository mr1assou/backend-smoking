import { ConfigService } from '@nestjs/config';
import type { R2Config } from '../types/r2-config';

export function loadR2Config(config: ConfigService): R2Config {
  const accountId = config.get<string>('R2_ACCOUNT_ID')?.trim();
  const bucket = config.get<string>('R2_BUCKET')?.trim();
  const endpoint = config.get<string>('R2_ENDPOINT')?.trim();
  const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID')?.trim();
  const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY')?.trim();
  const publicUrl = config
    .get<string>('R2_PUBLIC_URL')
    ?.trim()
    ?.replace(/\/$/, '');

  if (
    !accountId ||
    !bucket ||
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !publicUrl
  ) {
    throw new Error(
      'Missing R2 config. Set R2_ACCOUNT_ID, R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL in .env',
    );
  }

  return {
    accountId,
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}
