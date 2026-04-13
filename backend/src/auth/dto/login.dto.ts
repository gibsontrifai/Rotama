import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Username akun yang terdaftar di database.',
    example: '',
  })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({
    description: 'Password akun.',
    example: '',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
