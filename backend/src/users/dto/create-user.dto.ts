import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'new.user' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'SafetyHub@2026' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'New User' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ enum: ['technician', 'supervisor', 'administrator'], example: 'technician' })
  @IsEnum(['technician', 'supervisor', 'administrator'])
  role!: 'technician' | 'supervisor' | 'administrator';

  @ApiProperty({ example: 'Teknisi K3' })
  @IsString()
  @MinLength(2)
  position!: string;

  @ApiProperty({ example: 'Surabaya Plant' })
  @IsString()
  @MinLength(2)
  branch!: string;

  @ApiProperty({ example: 'new.user@safetyhub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '081234567890' })
  @IsString()
  @MinLength(8)
  phone!: string;
}
