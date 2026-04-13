import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateActionOwnerDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  owner!: string;
}
