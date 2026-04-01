import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TagEntry {
    @IsString()
    epc: string;

    @IsOptional()
    @IsInt()
    rssi?: number;
}

export class SubmitTagsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TagEntry)
    tags: TagEntry[];
}
