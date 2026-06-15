import { IsUrl } from 'class-validator';

export class UpdateProfileImageDto {
  @IsUrl({ require_protocol: true })
  image_url!: string;
}
