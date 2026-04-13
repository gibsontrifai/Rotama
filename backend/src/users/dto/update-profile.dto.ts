import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  position!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  branch!: string;

  @ApiProperty({ type: [String], example: ['Risk Assessment'] })
  @IsArray()
  @IsString({ each: true })
  expertise!: string[];

  @ApiProperty({ required: false, example: '' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
