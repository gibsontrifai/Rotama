import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token yang didapat dari endpoint login/refresh sebelumnya.',
  })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
