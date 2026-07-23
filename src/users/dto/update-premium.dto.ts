import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePremiumDto {
  @IsBoolean()
  isPremium: boolean;

  /** Must match this Quitify user id when granting premium. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  revenueCatOriginalAppUserId?: string;
}
