import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LabStatus } from '@prisma/client';

export class UpdateLabOrderDto {
  @IsOptional()
  @IsEnum(LabStatus)
  status?: LabStatus;

  @IsOptional()
  @IsString()
  results?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  performedBy?: string;
}
