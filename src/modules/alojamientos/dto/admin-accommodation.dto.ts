import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminAccommodationDto {
  @ApiProperty({ example: 'Casa Andina Boutique', minLength: 3, maxLength: 255 })
  @IsString() @MinLength(3) @MaxLength(255)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  nombre: string;

  @ApiProperty({ example: 1, description: 'Identificador de ciudad disponible en GET /cities' })
  @IsInt() @Min(1)
  cityId: number;

  @ApiProperty({ example: 'Un refugio acogedor en el centro histórico.' })
  @IsString() @MinLength(3) @MaxLength(3000)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  descripcion: string;

  @ApiProperty({ example: 'Centro histórico, Quito' })
  @IsString() @MinLength(3) @MaxLength(255)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  direccion: string;

  @ApiProperty({ example: 'Hotel boutique' })
  @IsString() @MinLength(3) @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  tipo: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' })
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000)
  image: string;

  @ApiProperty({ example: true }) @IsBoolean()
  published: boolean;

  @ApiProperty({ example: 89.50, minimum: 0.01, maximum: 100000 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000)
  precioPorNoche: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @IsInt() @Min(1) @Max(100)
  capacidadAdultos: number;

  @ApiProperty({ example: 1, minimum: 0, maximum: 100 })
  @IsInt() @Min(0) @Max(100)
  capacidadNinos: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 100 })
  @IsInt() @Min(1) @Max(100)
  habitaciones: number;

  @ApiProperty({ example: true }) @IsBoolean()
  tienePiscina: boolean;
}

export class PatchAccommodationDto extends PartialType(AdminAccommodationDto, { skipNullProperties: false }) {}

export class AccommodationFilterDto {
  @ApiPropertyOptional({ description: 'Coincidencia parcial por nombre, sin distinguir mayúsculas', example: 'andina' })
  @IsOptional() @IsString() @MaxLength(100)
  nombre?: string;
}
