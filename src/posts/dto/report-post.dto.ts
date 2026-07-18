import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
