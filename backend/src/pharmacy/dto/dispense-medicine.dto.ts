import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class DispenseMedicineDto {
  @IsUUID()
  medicineId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  prescriptionId?: string;

  @IsOptional()
  @IsString()
  dispensedBy?: string;
}
