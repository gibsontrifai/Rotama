import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateActionStatusDto {
  @ApiProperty({ enum: ['Open', 'In Progress', 'Blocked', 'Done'], example: 'Done' })
  @IsEnum(['Open', 'In Progress', 'Blocked', 'Done'])
  status!: 'Open' | 'In Progress' | 'Blocked' | 'Done';
}
