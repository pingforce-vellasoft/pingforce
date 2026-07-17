import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Split: inserts a new JUNCTION node under the target connection and
 * re-parents the selected children onto it.
 */
export class SplitConnectionDto {
  @IsString()
  @IsNotEmpty()
  readonly junctionCode!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  readonly childConnectionIds!: string[];
}
