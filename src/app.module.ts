import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlojamientosModule } from './modules/alojamientos/alojamientos.module';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), AlojamientosModule] })
export class AppModule {}
