import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
const trim = ({ value }: any) => (typeof value === 'string' ? value.trim() : value);
export class UsuarioDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) @Matches(/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u, { message: 'El nombre solo admite letras, espacios, apóstrofes y guiones; sin números' }) nombre: string;
  @ApiProperty({ format: 'email' })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  correo: string;
  @ApiProperty() @IsIn(['admin', 'customer']) rol: string;
  @ApiProperty() @IsBoolean() activo: boolean;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(128) contrasena: string;
}
export class EditarUsuarioDto extends PartialType(UsuarioDto, { skipNullProperties: false }) {}
export class GastoDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) @Transform(trim) concepto: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) @Transform(trim) proveedor: string;
  @ApiProperty() @IsInt() @Min(1) categoria_id: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) alojamiento_id?: number;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10000000) importe: number;
  @ApiProperty() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha: string;
  @ApiProperty() @IsIn(['PENDIENTE', 'PAGADO']) estado: string;
  @ApiProperty() @IsString() @MaxLength(2000) @Transform(trim) notas: string;
}
export class EditarGastoDto extends PartialType(GastoDto, { skipNullProperties: false }) {}
export class NombreDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) nombre: string;
}
export class CiudadDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) nombre: string;
  @ApiProperty() @IsString() @Matches(/^\d{4}$/) codigo: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) provincia: string;
  @ApiProperty() @IsIn(['Costa', 'Sierra', 'Amazonía', 'Insular']) region: string;
  @ApiProperty() @IsNumber() @Min(-6) @Max(2) latitud: number;
  @ApiProperty() @IsNumber() @Min(-92) @Max(-74) longitud: number;
}
export class EditarCiudadDto extends PartialType(CiudadDto, { skipNullProperties: false }) {}
