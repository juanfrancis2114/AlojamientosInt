import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  Param,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { AlojamientosService } from './alojamientos.service';
import { EstanciasService } from './estancias.service';
import { PerfilDto, ResenaDto, RespuestaResenaDto, TarifaDto } from './dto/estancias.dto';
@ApiTags('Perfil, reseñas, facturas y tarifas')
@ApiCookieAuth()
@Controller()
export class EstanciasController {
  constructor(
    private readonly auth: AlojamientosService,
    private readonly stays: EstanciasService,
  ) {}
  @Get('admin/erp/esquema')
  @ApiOperation({
    summary: 'Verificar tablas, relaciones y RLS de la base operativa; solo administrador',
  })
  async schema(@Req() req: any) {
    await this.auth.auth(req, true);
    const db = this.auth.database.db;
    if (db.options.type !== 'postgres')
      return { motor: db.options.type, tablas: db.entityMetadatas.length };
    const tables = await db.query(
      "SELECT tablename AS nombre, rowsecurity AS rls FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    const relationships = await db.query(
      "SELECT count(*)::integer AS cantidad FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'",
    );
    return {
      motor: 'postgres',
      tablas: tables.length,
      relaciones: relationships[0].cantidad,
      detalle: tables,
    };
  }
  @Get('me/profile') @ApiOperation({ summary: 'Consultar mi perfil' }) async profile(
    @Req() req: any,
  ) {
    return this.stays.profile(await this.auth.auth(req));
  }
  @Patch('me/profile')
  @ApiOperation({ summary: 'Editar nombre, contacto y documento de mi perfil' })
  async updateProfile(@Req() req: any, @Body() body: PerfilDto) {
    return this.stays.updateProfile(body, await this.auth.auth(req));
  }
  @Get('me/reviews')
  @ApiOperation({ summary: 'Consultar las reseñas que he publicado' })
  async mine(@Req() req: any) {
    return this.stays.reviews(await this.auth.auth(req));
  }
  @Get('orders/:id/invoice')
  @ApiOperation({
    summary: 'Factura simulada y detalles de mi reserva; admin también puede consultar',
  })
  async invoice(@Req() req: any, @Param('id') id: string) {
    return this.stays.invoice(id, await this.auth.auth(req));
  }
  @Post('orders/:id/review')
  @ApiOperation({ summary: 'Reseñar una estancia completada, una vez por reserva' })
  async review(@Req() req: any, @Param('id') id: string, @Body() body: ResenaDto) {
    return this.stays.createReview(id, body, await this.auth.auth(req));
  }
  @Get('admin/erp/facturas')
  @ApiOperation({ summary: 'Consultar facturas simuladas administrativas' })
  async invoices(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.stays.invoices();
  }
  @Get('admin/erp/resenas')
  @ApiOperation({ summary: 'Consultar reseñas de estancias' })
  async reviews(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.stays.reviews();
  }
  @Patch('admin/erp/resenas/:id')
  @ApiOperation({ summary: 'Responder a una reseña como administrador' })
  async reply(@Req() req: any, @Param('id') id: string, @Body() body: RespuestaResenaDto) {
    return this.stays.replyReview(id, body, await this.auth.auth(req, true));
  }
  @Get('admin/erp/tarifas')
  @ApiOperation({ summary: 'Consultar precios y cupos por fecha' })
  async calendar(@Req() req: any) {
    await this.auth.auth(req, true);
    return this.stays.calendar();
  }
  @Post('admin/erp/tarifas')
  @ApiOperation({ summary: 'Configurar hasta 93 días: precio, cupo o cierre sin afectar reservas' })
  async saveCalendar(@Req() req: any, @Body() body: TarifaDto) {
    return this.stays.saveCalendar(body, await this.auth.auth(req, true));
  }
  @Delete('admin/erp/tarifas/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Quitar excepción y restaurar tarifa e inventario base' })
  async deleteCalendar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.auth.auth(req, true);
    await this.stays.removeCalendar(id);
  }
}
