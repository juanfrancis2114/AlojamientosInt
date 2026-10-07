import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
const trim = ({ value }: any) => (typeof value === 'string' ? value.trim() : value);
export class PerfilDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) nombre: string;
  @ApiProperty()
  @IsString()
  @Matches(/^(?:\+?[0-9 ()-]{7,20})?$/)
  @Transform(trim)
  telefono: string;
  @ApiProperty()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]*$/)
  @Transform(trim)
  documento: string;
  @ApiProperty() @IsString() @MaxLength(300) @Transform(trim) direccion: string;
}
export class ResenaDto {
  @ApiProperty({ minimum: 1, maximum: 10 }) @IsInt() @Min(1) @Max(10) puntuacion: number;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(1500) @Transform(trim) comentario: string;
}
export class RespuestaResenaDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(1500) @Transform(trim) respuesta: string;
}
export class TarifaDto {
  @ApiProperty() @IsInt() @Min(1) alojamiento_id: number;
  @ApiProperty({ format: 'date' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) desde: string;
  @ApiProperty({ format: 'date' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  precio?: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(100) cupo?: number;
  @ApiProperty() @IsBoolean() cerrado: boolean;
  @ApiProperty() @IsString() @MaxLength(300) @Transform(trim) nota: string;
}
