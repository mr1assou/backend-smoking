import { IsString, MaxLength } from 'class-validator';

const NOTE_MAX_LENGTH = 500;

export class SavePlanTaskNoteDto {
  @IsString()
  @MaxLength(NOTE_MAX_LENGTH)
  note!: string;
}

export { NOTE_MAX_LENGTH };
