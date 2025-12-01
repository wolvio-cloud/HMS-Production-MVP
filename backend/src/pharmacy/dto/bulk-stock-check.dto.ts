import { IsArray, IsString } from 'class-validator';

export class BulkStockCheckDto {
  @IsArray()
  @IsString({ each: true })
  medicineIds: string[];
}
