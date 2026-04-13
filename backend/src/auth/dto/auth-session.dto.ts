import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionDto {
  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ enum: ['technician', 'supervisor', 'administrator'], example: 'administrator' })
  role!: 'technician' | 'supervisor' | 'administrator';

  @ApiProperty({ example: 'Budi Santoso' })
  fullName!: string;

  @ApiProperty({ example: 'Safety Manager' })
  position!: string;

  @ApiProperty({ example: 'Head Office - Jakarta' })
  branch!: string;

  @ApiProperty({ type: [String], example: ['Risk Assessment', 'Safety Policy'] })
  expertise!: string[];

  @ApiProperty({ required: false, example: 'https://example.com/avatar.png' })
  avatar?: string;

  @ApiProperty({ example: 'mock-access-token' })
  accessToken!: string;

  @ApiProperty({ example: 'mock-refresh-token' })
  refreshToken!: string;

  @ApiProperty({ example: 1776000000000 })
  expiresAt!: number;
}
