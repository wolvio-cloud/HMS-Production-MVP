import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for generating a bill from a visit
 */
export class GenerateBillDto {
  @IsString()
  visitId: string;

  @IsString()
  @IsOptional()
  generatedBy?: string; // User ID who generated the bill
}
