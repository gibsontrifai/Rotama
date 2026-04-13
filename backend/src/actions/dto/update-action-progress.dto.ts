import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class UpdateActionProgressDto {
  @ApiProperty({ example: 70 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;

  @ApiProperty({ enum: ['Open', 'In Progress', 'Blocked', 'Done'], example: 'In Progress' })
  @IsEnum(['Open', 'In Progress', 'Blocked', 'Done'])
  status!: 'Open' | 'In Progress' | 'Blocked' | 'Done';

  @ApiProperty({ example: '' })
  @IsString()
  note!: string;
}
