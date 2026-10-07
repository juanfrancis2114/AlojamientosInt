import { Injectable, OnModuleInit, OnModuleDestroy, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource, EntitySchema, EntityManager } from 'typeorm';
import { mkdirSync } from 'fs';
import { nombresTablas, nombresColumnas } from './nombres-base';
import { migrationEstancias } from './migration-estancias';
import { migrationGalerias } from './migration-galerias';
import { migrationReservas } from './migration-reservas';
import { migrationNombres } from './migration-nombres';

const id = { type: Number, primary: true, generated: true };
const uuid = { type: String, primary: true };
const text = { type: String };
const num = { type: Number };
const amount = { type: 'decimal', precision: 12, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } };
const json = { type: 'simple-json' };
const rel = (table: string, column: string) => ({ type: 'many-to-one', target: table, joinColumn: { name: nombresColumnas[column] || column }, onDelete: 'RESTRICT' });
const schema = (name: string, columns: any, relations: any = {},uniques:any[]=[]) => new EntitySchema<any>({ name, tableName: nombresTablas[name] || name, columns: Object.fromEntries(Object.entries(columns).map(([key, value]) => [key, { ...(value as any), name: nombresColumnas[key] || key }])), relations,uniques });
export const tables = [
  schema('imagenes_alojamiento',{id:uuid,alojamiento_id:num,orden:num,url:text,descripcion:text,autor:text,licencia:text,fuente:text,licencia_url:text,fecha_creacion:text},{alojamiento:rel('accommodations','alojamiento_id')},[{columns:['alojamiento_id','orden']},{columns:['alojamiento_id','url']}]),
  schema('users', { id: uuid, email: { ...text, unique: true }, name: text, passwordHash: text, role: text, createdAt: text, activo: { type: Boolean, default: true } }),
  schema('sessions', { id: uuid, userId: text, expiresAt: text }, { user: rel('users', 'userId') }),
  schema('cities', { id, name: text, country: text, codigo: { ...text, default: '' }, provincia: { ...text, default: '' }, region: { ...text, default: '' }, latitud: { ...num, type: 'double precision', default: 0 }, longitud: { ...num, type: 'double precision', default: 0 } }),
  schema('chains', { id, name: text }),
  schema('accommodations', { id, nombre: text, cityId: num, destino: text, descripcion: text, direccion: text, tipo: text, image: text, published: { type: Boolean }, createdAt: text, updatedAt: text }, { city: rel('cities', 'cityId') }),
  schema('room_types', { id, accommodationId: num, nombre: text, capacidadAdultos: num, capacidadNinos: num, habitaciones: num }, { accommodation: rel('accommodations', 'accommodationId') }),
  schema('rate_plans', { id, roomTypeId: num, precioPorNoche: { type: 'decimal', precision: 10, scale: 2 }, currency: text, cancellation: text }, { room: rel('room_types', 'roomTypeId') }),
  schema('facilities', { id, name: { ...text, unique: true } }),
  schema('accommodation_facilities', { id, accommodationId: num, facilityId: num }, { accommodation: rel('accommodations', 'accommodationId'), facility: rel('facilities', 'facilityId') }),
  schema('photos', { id, accommodationId: num, url: text, caption: text }, { accommodation: rel('accommodations', 'accommodationId') }),
  schema('reviews', { id, accommodationId: num, author: text, score: num, comment: text, createdAt: text }, { accommodation: rel('accommodations', 'accommodationId') }),
  schema('availability_products', { id: uuid, accommodationId: num, checkin: text, checkout: text, guests: json, total: amount, expiresAt: text }, { accommodation: rel('accommodations', 'accommodationId') }),
  schema('quotes', { id: uuid, productId: text, ownerId: text, total: amount, expiresAt: text }, { product: rel('availability_products', 'productId'), owner: rel('users', 'ownerId') }),
  schema('orders', { id: uuid, accommodationId: num, ownerId: text, quoteId: { ...text, unique: true }, locator: text, status: text, checkin: text, checkout: text, guests: json, total: amount, currency: text, paymentReference: text, customer: json, createdAt: text }, { accommodation: rel('accommodations', 'accommodationId'), owner: rel('users', 'ownerId'), quote: rel('quotes', 'quoteId') }),
  schema('order_guests', { id, orderId: text, name: text, age: num }, { order: rel('orders', 'orderId') }),
  schema('idempotency_keys', { id: uuid, ownerId: text, operation: text, fingerprint: text, response: json, createdAt: text }, { owner: rel('users', 'ownerId') }),
  schema('outbox_events', { id: uuid, eventType: text, resourceId: text, timestamp: text, data: json, status: text }),
  schema('webhook_subscriptions', { id: uuid, ownerId: text, url: text, events: json, secret: text }, { owner: rel('users', 'ownerId') }),
  schema('audit_logs', { id: uuid, actorId: text, action: text, resourceId: text, timestamp: text }, { actor: rel('users', 'actorId') }),
  schema('transaction_lock', { id: { type: Number, primary: true }, version: num }),
  schema('categorias_gasto', { id, nombre: { ...text, unique: true } }),
  schema('perfiles_usuario',{usuario_id:{...text,primary:true},telefono:text,documento:text,direccion:text,fecha_actualizacion:text},{usuario:rel('users','usuario_id')}),
  schema('calendario_tarifas',{id,alojamiento_id:num,fecha:text,precio:{...amount,nullable:true,transformer:{to:(value:any)=>value,from:(value:any)=>value==null?null:Number(value)}},cupo:{...num,nullable:true},cerrado:{type:Boolean},nota:text,actor_id:text,fecha_actualizacion:text},{alojamiento:rel('accommodations','alojamiento_id'),actor:rel('users','actor_id')}),
  schema('facturas',{id:uuid,reserva_id:{...text,unique:true},usuario_id:text,numero:{...text,unique:true},emisor:json,cliente:json,fecha_emision:text,subtotal:amount,impuestos:amount,total:amount,moneda:text,estado:text,version:num},{reserva:rel('orders','reserva_id'),usuario:rel('users','usuario_id')}),
  schema('detalles_factura',{id,factura_id:text,descripcion:text,cantidad:num,precio_unitario:amount,subtotal:amount},{factura:rel('facturas','factura_id')}),
  schema('resenas_estancia',{id:uuid,reserva_id:{...text,unique:true},usuario_id:text,alojamiento_id:num,puntuacion:num,comentario:text,fecha_creacion:text,respuesta:text,respondido_por:{...text,nullable:true},fecha_respuesta:{...text,nullable:true}},{reserva:rel('orders','reserva_id'),usuario:rel('users','usuario_id'),alojamiento:rel('accommodations','alojamiento_id'),administrador:rel('users','respondido_por')}),
  schema('gastos', { id: uuid, concepto: text, proveedor: text, categoria_id: num, alojamiento_id: { ...num, nullable: true }, importe: amount, fecha: text, estado: text, notas: text, actor_id: text, fecha_creacion: text }, { categoria: rel('categorias_gasto', 'categoria_id'), alojamiento: rel('accommodations', 'alojamiento_id'), actor: rel('users', 'actor_id') }),
];

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  db: DataSource;
  private gate = Promise.resolve();
  private initialization: Promise<void>;
  onModuleInit() { return this.ready(); }
  ready() { return this.initialization ||= this.initialize(); }
  private async initialize() {
    if (process.env.VERCEL && !process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria en Vercel');
    const postgres = !!process.env.DATABASE_URL;
    if (!postgres) mkdirSync('data', { recursive: true });
    this.db = new DataSource(postgres ? {
      type: 'postgres', url: process.env.DATABASE_URL, entities: tables, synchronize: false,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true, ...(process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA.replace(/\\n/g, '\n') } : {}) } : false,
      extra: { max: 3, connectionTimeoutMillis: 10000 },
    } : { type: 'sqljs', location: process.env.DATA_FILE || 'data/booking.sqlite', autoSave: true, entities: tables, synchronize: true });
    await this.db.initialize();
    if(postgres&&process.env.APPLY_DEMO_UPGRADE==='true')await this.db.transaction(async em=>{await em.query('SELECT pg_advisory_xact_lock(73123321)');const result=await em.query("SELECT to_regclass('public.resenas_estancia') AS name");if(!result[0].name){await em.query(migrationEstancias);console.log('Migración aditiva de estancias aplicada desde la nube');}});
    if(postgres&&process.env.APPLY_DEMO_UPGRADE==='true')await this.db.transaction(async em=>{await em.query('SELECT pg_advisory_xact_lock(73123321)');const result=await em.query("SELECT to_regclass('public.imagenes_alojamiento') AS name");if(!result[0].name){await em.query(migrationGalerias);console.log('Tabla de galerías aplicada desde la nube');}});
    if (!postgres) await this.db.getRepository('transaction_lock').save({ id: 1, version: 0 });
    else if (!await this.db.getRepository('transaction_lock').findOneBy({ id: 1 })) throw new Error('Falta aplicar la migración inicial y su fila de control');
    if (postgres) await this.db.transaction(async em => {
      await em.query('SELECT pg_advisory_xact_lock(73123321)');
      const triggers = await em.query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.reservas'::regclass AND tgname = 'reservas_sin_solapamiento' AND NOT tgisinternal");
      if (!triggers.length) {
        await em.query(migrationReservas);
        console.log('Bloqueo de reservas solapadas instalado en PostgreSQL');
      }
      const nameTriggers = await em.query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.usuarios'::regclass AND tgname = 'usuarios_nombre_valido' AND NOT tgisinternal");
      if (!nameTriggers.length) {
        await em.query(migrationNombres);
        console.log('Validación de nombres instalada en PostgreSQL');
      }
    });
  }
  async transaction<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    let release: () => void;
    const previous = this.gate;
    this.gate = new Promise<void>(resolve => release = resolve);
    await previous;
    try { return await this.db.transaction(async em => {
      if (this.db.options.type === 'postgres') await em.query('SELECT id FROM bloqueo_transacciones WHERE id=1 FOR UPDATE');
      return fn(em);
    }); } catch (error) {
      if (error?.driverError?.constraint === 'nombre_usuario_valido')
        throw new BadRequestException('Nombre de 2 a 100 caracteres: letras, espacios, apóstrofes y guiones; sin números');
      if (error?.driverError?.code === '23P01')
        throw new ConflictException('Este alojamiento ya está reservado en esas fechas. Elige otras fechas');
      throw error;
    } finally { release(); }
  }
  async onModuleDestroy() { if (this.db?.isInitialized) await this.db.destroy(); }
}
