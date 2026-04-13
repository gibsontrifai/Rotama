import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ActivateUserDto {
  @ApiProperty({
    example:
      'eyJ1c2VySWQiOjUsImVtYWlsIjoibmV3LnVzZXJAc2FmZXR5aHViLmxvY2FsIiwiZXhwIjoxNzg2NjE1MTQwfQ.PM-0ec1iI5RYI8R6Jf0Gzq4oXgQ3xzlA2lM7qWfc6I0',
  })
  @IsString()
  @MinLength(20)
  token!: string;
}
