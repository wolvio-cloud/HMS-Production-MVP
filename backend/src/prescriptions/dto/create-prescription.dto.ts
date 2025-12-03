import { IsUUID, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsUUID()
  medicineId: string;

  @IsString()
  dosage: string; // e.g., "1 tablet", "5ml"

  @IsString()
  frequency: string; // e.g., "3 times daily", "Twice a day"

  @IsString()
  duration: string; // e.g., "5 days", "2 weeks"

  @IsOptional()
  @IsString()
  instructions?: string; // e.g., "After food"
}

export class CreatePrescriptionDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
