import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateInspectionDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  area!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  inspector!: string;

  @ApiProperty({ example: 80 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty({
    type: [String],
    example: ['Apar', 'Hidrant'],
    required: false,
    description: 'Selected checklist categories',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistCategories?: string[];
}
