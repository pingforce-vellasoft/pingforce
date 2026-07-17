import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateOlteDto } from './create-olte.dto';

export class UpdateOlteDto extends PartialType(
  OmitType(CreateOlteDto, ['code'] as const),
) {}
