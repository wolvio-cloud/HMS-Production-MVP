import { IsUUID, IsString, IsOptional } from 'class-validator';

export class AddPrescriptionItemDto {
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
