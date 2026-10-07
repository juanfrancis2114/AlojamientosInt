import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AlojamientosService } from './alojamientos.service';
import { ErpService } from './erp.service';
import { validateContract } from './contract';
import {
  CiudadDto,
  EditarCiudadDto,
  EditarGastoDto,
  EditarUsuarioDto,
  GastoDto,
  NombreDto,
  UsuarioDto,
} from './dto/erp.dto';
@Controller('admin/erp')
@ApiTags('Administración ERP')
@ApiBearerAuth()
@ApiCookieAuth()
export class ErpController {
  constructor(
    private readonly auth: AlojamientosService,
    private readonly erp: ErpService,
  ) {}
  @Get('dashboard') async dashboard(
    @Req() req: any,
    @Query('desde') start: string,
    @Query('hasta') end: string,
  ) {
    await this.auth.auth(req, true);
    return this.erp.dashboard(start, end);
  }
  @Get('usuarios') async users(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.erp.users();
  }
  @Post('usuarios') async createUser(@Req() req: any, @Body() body: UsuarioDto) {
    const actor = await this.auth.auth(req, true);
    validateContract('AdminUserCreate', body);
    return this.erp.saveUser(body, actor);
  }
  @Patch('usuarios/:id') async updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: EditarUsuarioDto,
  ) {
    return this.erp.saveUser(body, await this.auth.auth(req, true), id);
  }
  @Delete('usuarios/:id') @HttpCode(204) async disableUser(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    await this.erp.saveUser({ activo: false }, await this.auth.auth(req, true), id);
  }
  @Get('gastos') async expenses(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.erp.expenses();
  }
  @Post('gastos') async createExpense(@Req() req: any, @Body() body: GastoDto) {
    return this.erp.saveExpense(body, await this.auth.auth(req, true));
  }
  @Patch('gastos/:id') async updateExpense(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: EditarGastoDto,
  ) {
    return this.erp.saveExpense(body, await this.auth.auth(req, true), id);
  }
  @Delete('gastos/:id') @HttpCode(204) async deleteExpense(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    await this.erp.removeExpense(id, await this.auth.auth(req, true));
  }
  @Get('categorias') async categories(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.auth.database.db.manager.find('categorias_gasto');
  }
  @Post('categorias') async createCategory(@Req() req: any, @Body() body: NombreDto) {
    return this.erp.saveCategory(body, await this.auth.auth(req, true));
  }
  @Patch('categorias/:id') async updateCategory(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NombreDto,
  ) {
    return this.erp.saveCategory(body, await this.auth.auth(req, true), id);
  }
  @Delete('categorias/:id') @HttpCode(204) async deleteCategory(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.erp.removeCategory(id, await this.auth.auth(req, true));
  }
  @Get('ciudades') async cities(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.auth.database.db.manager.find('cities', { order: { name: 'ASC' } });
  }
  @Post('ciudades') async createCity(@Req() req: any, @Body() body: CiudadDto) {
    return this.erp.saveCity(body, await this.auth.auth(req, true));
  }
  @Patch('ciudades/:id') async updateCity(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditarCiudadDto,
  ) {
    return this.erp.saveCity(body, await this.auth.auth(req, true), id);
  }
  @Delete('ciudades/:id') @HttpCode(204) async deleteCity(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.erp.removeCity(id, await this.auth.auth(req, true));
  }
}
