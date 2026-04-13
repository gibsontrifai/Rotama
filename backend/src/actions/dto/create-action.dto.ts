import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';

export class CreateActionDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  area!: string;

  @ApiProperty({ enum: ['Incident', 'Inspection', 'Audit'], example: 'Inspection' })
  @IsEnum(['Incident', 'Inspection', 'Audit'])
  source!: 'Incident' | 'Inspection' | 'Audit';

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  sourceRef!: string;

  @ApiProperty({ enum: ['Critical', 'High', 'Medium'], example: 'High' })
  @IsEnum(['Critical', 'High', 'Medium'])
  priority!: 'Critical' | 'High' | 'Medium';

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  owner!: string;

  @ApiProperty({ example: '15 Apr, 16:00' })
  @IsString()
  @Matches(/^\d{1,2}\s[A-Za-z]{3},\s\d{2}:\d{2}$/)
  dueDate!: string;
}
