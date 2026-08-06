import {
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  normalizeStoredUsername,
  USERNAME_STORED_MAX_LENGTH,
} from '../lib/normalize-username';

const OTHER_TEXT_MAX_LENGTH = 500;

class OnboardingStep1Dto {
  @IsArray()
  @IsString({ each: true })
  quitReasons: string[];

  @IsOptional()
  @IsString()
  @MaxLength(OTHER_TEXT_MAX_LENGTH)
  otherText?: string;
}

class OnboardingStep2Dto {
  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(OTHER_TEXT_MAX_LENGTH)
  otherText?: string;
}

class OnboardingStep3Dto {
  @IsOptional()
  @IsString()
  priorQuitAttempts?: string;

  @IsOptional()
  @IsString()
  @MaxLength(OTHER_TEXT_MAX_LENGTH)
  otherText?: string;
}

class OnboardingStep4Dto {
  @IsArray()
  @IsString({ each: true })
  primaryInterests: string[];

  @IsOptional()
  @IsString()
  @MaxLength(OTHER_TEXT_MAX_LENGTH)
  otherText?: string;
}

class OnboardingStep5Dto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeStoredUsername(value) : value,
  )
  @IsString()
  @MaxLength(USERNAME_STORED_MAX_LENGTH)
  username: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryFlag?: string;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  quitDatePreset?: string;

  /** UTC ISO-8601 instant, e.g. local quit-day midnight as `2026-06-08T00:00:00.000Z`. */
  @IsOptional()
  @IsISO8601()
  quitDate?: string;
}

class OnboardingStep6Dto {
  @IsInt()
  @Min(1)
  cigarettesPerDay: number;

  @IsOptional()
  @IsString()
  cigarettesPerDayNote?: string;

  @IsOptional()
  @IsString()
  packPrice?: string;

  @IsOptional()
  @IsString()
  yearsSmoking?: string;

  @IsInt()
  @Min(1)
  cigarettesPerPack: number;
}

export class UpdateOnboardingDto {
  @ValidateNested()
  @Type(() => OnboardingStep1Dto)
  step1: OnboardingStep1Dto;

  @ValidateNested()
  @Type(() => OnboardingStep2Dto)
  step2: OnboardingStep2Dto;

  @ValidateNested()
  @Type(() => OnboardingStep3Dto)
  step3: OnboardingStep3Dto;

  @ValidateNested()
  @Type(() => OnboardingStep4Dto)
  step4: OnboardingStep4Dto;

  @ValidateNested()
  @Type(() => OnboardingStep5Dto)
  step5: OnboardingStep5Dto;

  @ValidateNested()
  @Type(() => OnboardingStep6Dto)
  step6: OnboardingStep6Dto;
}
