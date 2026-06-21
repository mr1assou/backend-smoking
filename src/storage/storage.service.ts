import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import {
  R2_ALLOWED_CHAT_MEDIA_TYPES,
  R2_ALLOWED_IMAGE_TYPES,
  R2_FOLDERS,
  type R2ChatMediaContentType,
  type R2ImageContentType,
} from './lib/r2.constants';
import { mimeToExtension } from './lib/mime-to-extension';
import { StorageRepository } from './storage.repository';
import type { PresignedUpload } from './types/presigned-upload';

@Injectable()
export class StorageService {
  constructor(private readonly storageRepository: StorageRepository) {}

  createPostUploadUrl(
    userId: number,
    dto: CreateUploadUrlDto,
  ): Promise<PresignedUpload> {
    return this.createImageUploadUrl(R2_FOLDERS.POSTS, userId, dto.contentType);
  }

  createProfileUploadUrl(
    userId: number,
    dto: CreateUploadUrlDto,
  ): Promise<PresignedUpload> {
    return this.createImageUploadUrl(
      R2_FOLDERS.PROFILES,
      userId,
      dto.contentType,
    );
  }

  createChatMediaUploadUrl(
    userId: number,
    contentType: R2ChatMediaContentType,
  ): Promise<PresignedUpload> {
    return this.createMediaUploadUrl(R2_FOLDERS.MESSAGES, userId, contentType);
  }

  createMusicUploadUrl(
    slug: string,
    fileName: string,
    contentType: R2ChatMediaContentType,
  ): Promise<PresignedUpload> {
    this.assertAllowedMusicAudioType(contentType, fileName);
    const key = this.storageRepository.buildMusicObjectKey(slug, fileName);
    return this.createPresignedUpload(key, contentType);
  }

  assertMusicUrl(url: string): void {
    const prefix = this.storageRepository.musicFolderPrefix();
    if (!url.startsWith(prefix)) {
      throw new BadRequestException('URL must point to the music folder in R2');
    }
  }

  assertOwnedPostImageUrl(userId: number, imageUrl: string): void {
    this.assertOwnedImageUrl(R2_FOLDERS.POSTS, userId, imageUrl, 'posts');
  }

  assertOwnedProfileImageUrl(userId: number, imageUrl: string): void {
    this.assertOwnedImageUrl(R2_FOLDERS.PROFILES, userId, imageUrl, 'profiles');
  }

  assertOwnedChatMediaUrl(userId: number, mediaUrl: string): void {
    this.assertOwnedImageUrl(R2_FOLDERS.MESSAGES, userId, mediaUrl, 'messages');
  }

  private assertOwnedImageUrl(
    folder: string,
    userId: number,
    imageUrl: string,
    label: string,
  ): void {
    const prefix = this.storageRepository.userFolderPrefix(folder, userId);
    if (!imageUrl.startsWith(prefix)) {
      throw new BadRequestException(
        `Image URL must be uploaded to your ${label} folder`,
      );
    }
  }

  private async createImageUploadUrl(
    folder: string,
    userId: number,
    contentType: R2ImageContentType,
  ): Promise<PresignedUpload> {
    this.assertAllowedImageType(contentType);
    return this.createMediaUploadUrl(folder, userId, contentType);
  }

  private async createMediaUploadUrl(
    folder: string,
    userId: number,
    contentType: R2ChatMediaContentType,
  ): Promise<PresignedUpload> {
    this.assertAllowedChatMediaType(contentType);

    const fileName = `${uuidv4()}${mimeToExtension(contentType)}`;
    const key = this.storageRepository.buildObjectKey(folder, userId, fileName);
    return this.createPresignedUpload(key, contentType);
  }

  private async createPresignedUpload(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const { uploadUrl, expiresIn } =
      await this.storageRepository.createPresignedPutUrl(key, contentType);

    return {
      uploadUrl,
      imageUrl: this.storageRepository.publicUrlForKey(key),
      key,
      expiresIn,
    };
  }

  private assertAllowedMusicAudioType(
    contentType: R2ChatMediaContentType,
    fileName: string,
  ): void {
    const lower = fileName.toLowerCase();
    const isAudio = R2_ALLOWED_CHAT_MEDIA_TYPES.includes(contentType);

    if (!isAudio) {
      throw new BadRequestException('Only audio files can be uploaded for music');
    }

    if (!/\.(mp3|wav|m4a|aac)$/i.test(lower)) {
      throw new BadRequestException('Invalid audio file name');
    }
  }

  private assertAllowedImageType(contentType: R2ImageContentType): void {
    if (!R2_ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new BadRequestException('Unsupported image type');
    }
  }

  private assertAllowedChatMediaType(
    contentType: R2ChatMediaContentType,
  ): void {
    if (!R2_ALLOWED_CHAT_MEDIA_TYPES.includes(contentType)) {
      throw new BadRequestException('Unsupported media type');
    }
  }
}
