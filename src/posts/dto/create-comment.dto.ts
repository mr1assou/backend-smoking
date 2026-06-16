import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parent_comment_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reply_to_user_id?: number;
}
