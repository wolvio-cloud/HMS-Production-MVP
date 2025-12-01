import { IsUUID, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateLabOrderDto {
  @IsUUID()
  patientId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  testIds: string[]; // Array of lab test IDs

  @IsOptional()
  @IsString()
  clinicalNotes?: string; // Doctor's clinical notes for lab technician

  @IsOptional()
  @IsString()
  urgency?: 'ROUTINE' | 'URGENT' | 'STAT'; // Priority level
}
