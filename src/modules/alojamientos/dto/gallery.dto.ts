import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  ValidateNested,
  IsUrl,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
const trim = ({ value }: any) => (typeof value === 'string' ? value.trim() : value);
export class GalleryImageDto {
  @ApiProperty({ format: 'uri' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(3000)
  url: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(180) @Transform(trim) descripcion: string;
  @ApiProperty() @IsString() @MaxLength(400) @Transform(trim) autor: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) licencia: string;
  @ApiProperty({ format: 'uri' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(3000)
  fuente: string;
  @ApiProperty({ format: 'uri' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(3000)
  licencia_url: string;
}
export class GalleryDto {
  @ApiProperty({ type: [GalleryImageDto], minItems: 4, maxItems: 4 })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => GalleryImageDto)
  imagenes: GalleryImageDto[];
}
