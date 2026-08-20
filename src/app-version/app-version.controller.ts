import { Controller, Get } from '@nestjs/common';

/** Bump MIN_SUPPORTED_APP_VERSION (env) after each release you want to force. */
const DEFAULT_MIN_SUPPORTED_VERSION = '1.0.0';

const ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.pottypaw.quitify';

@Controller('app-version')
export class AppVersionController{
  /** Public: clients call this on launch to know if they must update. */
  @Get()
  getRequirement() {
    return {
      minSupportedVersion:
        process.env.MIN_SUPPORTED_APP_VERSION ?? DEFAULT_MIN_SUPPORTED_VERSION,
      androidStoreUrl: process.env.ANDROID_STORE_URL ?? ANDROID_STORE_URL,
      iosStoreUrl: process.env.IOS_STORE_URL ?? null,
    };
  }
}
