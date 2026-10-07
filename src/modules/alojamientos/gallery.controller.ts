import {
  Controller,
  Get,
  Put,
  Req,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AlojamientosService } from './alojamientos.service';
import { GalleryDto } from './dto/gallery.dto';
@Controller()
@ApiTags('Galerías de alojamientos')
export class GalleryController {
  constructor(private readonly booking: AlojamientosService) {}
  @Get('catalog/:id/gallery')
  @ApiOperation({
    summary: 'Consultar las cuatro imágenes ilustrativas de un alojamiento publicado',
  })
  async publicGallery(@Param('id', ParseIntPipe) id: number) {
    const h = await this.booking.hotel(this.booking.database.db.manager, id);
    if (!h.published) throw new NotFoundException('Alojamiento no publicado');
    return h.galeria;
  }
  @Get('admin/accommodations/:id/gallery')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Consultar la galería administrativa' })
  async adminGallery(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.booking.auth(req, true);
    const h = await this.booking.hotel(this.booking.database.db.manager, id);
    return h.galeria;
  }
  @Put('admin/accommodations/:id/gallery')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Reemplazar y ordenar cuatro imágenes diferentes, con créditos y portada',
  })
  async replaceGallery(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: GalleryDto,
  ) {
    const actor = await this.booking.auth(req, true);
    if (new Set(body.imagenes.map((i) => i.url)).size !== 4)
      throw new BadRequestException('Las cuatro imágenes deben tener URLs distintas');
    return this.booking.database.transaction(async (em) => {
      await this.booking.hotel(em, id);
      await em.delete('imagenes_alojamiento', { alojamiento_id: id });
      const rows = body.imagenes.map((image, index) => ({
        id: randomUUID(),
        alojamiento_id: id,
        orden: index + 1,
        ...image,
        fecha_creacion: new Date().toISOString(),
      }));
      await em.insert('imagenes_alojamiento', rows);
      await em.update(
        'accommodations',
        { id },
        { image: rows[0].url, updatedAt: new Date().toISOString() },
      );
      await em.delete('photos', { accommodationId: id });
      await em.save('photos', {
        accommodationId: id,
        url: rows[0].url,
        caption: JSON.stringify({
          author: rows[0].autor,
          license: rows[0].licencia,
          source: rows[0].fuente,
          licenseUrl: rows[0].licencia_url,
        }),
      });
      await em.save('audit_logs', {
        id: randomUUID(),
        actorId: actor.id,
        action: 'GALLERY_UPDATED',
        resourceId: String(id),
        timestamp: new Date().toISOString(),
      });
      return rows;
    });
  }
}
