import {EstanciasService} from './estancias.service';
import {EstanciasController} from './estancias.controller';
import { Module } from '@nestjs/common';
import { AlojamientosService } from './alojamientos.service';
import { AlojamientosController } from './alojamientos.controller';
import { Database } from './database';
import { JwtAuth } from './jwt-auth';
import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';
@Module({ controllers: [AlojamientosController, ErpController, EstanciasController], providers: [Database, JwtAuth, AlojamientosService, ErpService, EstanciasService] })
export class AlojamientosModule {}
