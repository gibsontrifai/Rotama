import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({ example: 'mock-access-token' })
  accessToken!: string;

  @ApiProperty({ example: 'mock-refresh-token' })
  refreshToken!: string;

  @ApiProperty({ example: 1776000000000 })
  expiresAt!: number;
}
