import { IsBoolean } from 'class-validator';

export class UpdatePremiumDto {
  @IsBoolean()
  isPremium: boolean;
}

