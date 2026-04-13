import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class ExportReportDto {
  @ApiProperty({ enum: ['pdf', 'excel'], example: 'pdf' })
  @IsEnum(['pdf', 'excel'])
  target!: 'pdf' | 'excel';
}
