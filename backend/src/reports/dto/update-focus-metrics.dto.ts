import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

export class UpdateFocusMetricsDto {
  @ApiProperty({
    type: [String],
    enum: ['TRIR', 'Near Miss', 'CAPA'],
    example: ['TRIR', 'Near Miss', 'CAPA'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(['TRIR', 'Near Miss', 'CAPA'], { each: true })
  metrics!: Array<'TRIR' | 'Near Miss' | 'CAPA'>;
}
