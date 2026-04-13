import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AddActionAttachmentDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ['Photo', 'Document'], example: 'Photo' })
  @IsEnum(['Photo', 'Document'])
  kind!: 'Photo' | 'Document';

  @ApiProperty({ required: false, example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ required: false, example: '1.2 MB' })
  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @ApiProperty({ required: false, example: '' })
  @IsOptional()
  @IsString()
  previewUrl?: string;
}
