import type { R2ChatMediaContentType } from './r2.constants';

export function mimeToExtension(contentType: R2ChatMediaContentType): string {
  switch (contentType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'video/mp4':
      return '.mp4';
    case 'video/quicktime':
      return '.mov';
    case 'audio/mpeg':
      return '.mp3';
    case 'audio/mp4':
      return '.m4a';
    case 'audio/aac':
      return '.aac';
    case 'audio/wav':
      return '.wav';
  }
}
