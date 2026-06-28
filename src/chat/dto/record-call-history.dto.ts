import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { CALL_KINDS } from '../../call/types/call.types';
import { CALL_HISTORY_STATUSES } from '../lib/call-history-message';

export class RecordCallHistoryDto {
  @IsInt()
  @Min(1)
  peer_user_id!: number;

  @IsString()
  @IsNotEmpty()
  call_id!: string;

  @IsIn(CALL_KINDS)
  call_kind!: (typeof CALL_KINDS)[number];

  @IsIn(CALL_HISTORY_STATUSES)
  status!: (typeof CALL_HISTORY_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60 * 1000)
  duration_ms?: number;
}
