import { IsString, MaxLength } from 'class-validator';

export class UpdateProfileImageDto {
  @IsString()
  @MaxLength(2048)
  image_url!: string;
}
