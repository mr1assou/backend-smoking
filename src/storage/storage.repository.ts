import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadR2Config } from './lib/r2.config';
import { R2_PRESIGN_EXPIRES_SECONDS } from './lib/r2.constants';

@Injectable()
export class StorageRepository {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const r2 = loadR2Config(config);
    this.bucket = r2.bucket;
    this.publicUrl = r2.publicUrl;
    this.client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  }

  buildObjectKey(folder: string, userId: number, fileName: string): string {
    return `${folder}/${userId}/${fileName}`;
  }

  publicUrlForKey(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  userFolderPrefix(folder: string, userId: number): string {
    return `${this.publicUrl}/${folder}/${userId}/`;
  }

  createPresignedPutUrl(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; expiresIn: number }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    return getSignedUrl(this.client, command, {
      expiresIn: R2_PRESIGN_EXPIRES_SECONDS,
    }).then((uploadUrl) => ({
      uploadUrl,
      expiresIn: R2_PRESIGN_EXPIRES_SECONDS,
    }));
  }
}
