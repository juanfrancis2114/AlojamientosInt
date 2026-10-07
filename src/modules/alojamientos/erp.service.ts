import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from './database';
import { hashPassword } from './seed';
const now = () => new Date().toISOString();
const round = (n: number) => Math.round(n * 100) / 100;
export function erpMetrics(
  cities: any[],
  hotels: any[],
  orders: any[],
  expenses: any[],
  categories: any[],
  users: any[],
  start: string,
  end: string,
) {
  const period = orders.filter(
    (o) => o.createdAt.slice(0, 10) >= start && o.createdAt.slice(0, 10) <= end,
  );
  const confirmed = period.filter((o) => o.status === 'CONFIRMED');
  const spending = expenses.filter((g) => g.fecha >= start && g.fecha <= end);
  const income = round(confirmed.reduce((s, o) => s + o.total, 0));
  const paid = round(
    spending.filter((g) => g.estado === 'PAGADO').reduce((s, g) => s + g.importe, 0),
  );
  const pending = round(
    spending.filter((g) => g.estado === 'PENDIENTE').reduce((s, g) => s + g.importe, 0),
  );
  const hotelMap = new Map(hotels.map((h) => [h.id, h]));
  const cancelled = period.filter((o) => o.status === 'CANCELLED').length;
  const cityRows = cities.map((city) => {
    const local = confirmed.filter((o) => hotelMap.get(o.accommodationId)?.cityId === city.id);
    return {
      ...city,
      alojamientos: hotels.filter((h) => h.cityId === city.id).length,
      reservas: local.length,
      ingresos: round(local.reduce((s, o) => s + o.total, 0)),
      porcentaje: confirmed.length ? round((local.length * 100) / confirmed.length) : 0,
    };
  });
  const byCategory = categories.map((c) => {
    const amount = round(
      spending
        .filter((g) => g.categoria_id === c.id && g.estado === 'PAGADO')
        .reduce((s, g) => s + g.importe, 0),
    );
    return {
      nombre: c.nombre,
      importe: amount,
      porcentaje: paid ? round((amount * 100) / paid) : 0,
    };
  });
  const monthly = new Map<string, any>();
  for (const o of confirmed) {
    const month = o.createdAt.slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, { mes: month, ingresos: 0, gastos: 0 });
    monthly.get(month).ingresos += o.total;
  }
  for (const g of spending.filter((g) => g.estado === 'PAGADO')) {
    const month = g.fecha.slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, { mes: month, ingresos: 0, gastos: 0 });
    monthly.get(month).gastos += g.importe;
  }
  return {
    periodo: { desde: start, hasta: end },
    indicadores: {
      ingresos: income,
      gastos_pagados: paid,
      gastos_pendientes: pending,
      resultado: round(income - paid),
      margen: income ? round(((income - paid) * 100) / income) : 0,
      reservas_confirmadas: confirmed.length,
      reservas_canceladas: cancelled,
      tasa_cancelacion: period.length ? round((cancelled * 100) / period.length) : 0,
      usuarios_activos: users.filter((u) => u.activo).length,
      alojamientos_publicados: hotels.filter((h) => h.published).length,
      ciudades: cities.length,
    },
    ciudades: cityRows,
    ciudades_destacadas: [...cityRows]
      .sort((a, b) => b.reservas - a.reservas || b.ingresos - a.ingresos)
      .filter((c) => c.reservas > 0)
      .slice(0, 10),
    gastos_por_categoria: byCategory,
    evolucion: [...monthly.values()]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({ ...m, ingresos: round(m.ingresos), gastos: round(m.gastos) })),
  };
}
@Injectable()
export class ErpService {
  constructor(private readonly database: Database) {}
  userView(u: any) {
    return {
      id: u.id,
      nombre: u.name,
      correo: u.email,
      rol: u.role,
      activo: u.activo,
      fecha_creacion: u.createdAt,
    };
  }
  async audit(em: any, actor: any, action: string, id: string) {
    await em.save('audit_logs', {
      id: randomUUID(),
      actorId: actor.id,
      action,
      resourceId: String(id),
      timestamp: now(),
    });
  }
  async users() {
    const em = this.database.db.manager;
    const [users, orders, sessions] = await Promise.all([
      em.find<any>('users'),
      em.find<any>('orders'),
      em.find<any>('sessions'),
    ]);
    return users.map((u) => ({
      ...this.userView(u),
      reservas: orders.filter((o) => o.ownerId === u.id).length,
      sesiones_activas: sessions.filter((s) => s.userId === u.id && s.expiresAt > now()).length,
    }));
  }
  async saveUser(input: any, actor: any, id?: string) {
    return this.database.transaction(async (em) => {
      const previous = id ? await em.findOneBy<any>('users', { id }) : null;
      if (id && !previous) throw new NotFoundException('Usuario no encontrado');
      const user = {
        ...(previous || {}),
        name: input.nombre ?? previous?.name,
        email: input.correo ?? previous?.email,
        role: input.rol ?? previous?.role,
        activo: input.activo ?? previous?.activo,
      };
      const duplicate = await em.findOneBy<any>('users', { email: user.email });
      if (duplicate && duplicate.id !== id)
        throw new ConflictException('El correo ya está registrado');
      if (id === actor.id && (!user.activo || user.role !== 'admin'))
        throw new ConflictException(
          'No puedes desactivar tu propia cuenta ni quitarte el rol de administrador',
        );
      if (
        previous?.role === 'admin' &&
        previous.activo &&
        (!user.activo || user.role !== 'admin') &&
        (await em.countBy('users', { role: 'admin', activo: true })) <= 1
      )
        throw new ConflictException('Debe quedar un administrador activo');
      if (input.contrasena) user.passwordHash = hashPassword(input.contrasena);
      if (!id) {
        user.id = randomUUID();
        user.createdAt = now();
      }
      await em.save('users', user);
      if (
        id &&
        (input.contrasena || input.activo === false || (input.rol && input.rol !== previous.role))
      )
        await em.delete('sessions', { userId: id });
      await this.audit(em, actor, id ? 'USUARIO_ACTUALIZADO' : 'USUARIO_CREADO', user.id);
      return this.userView(user);
    });
  }
  async expenses() {
    const em = this.database.db.manager;
    const [data, categories, hotels] = await Promise.all([
      em.find<any>('gastos', { order: { fecha: 'DESC' } }),
      em.find<any>('categorias_gasto'),
      em.find<any>('accommodations'),
    ]);
    return data.map((g) => ({
      ...g,
      categoria: categories.find((c) => c.id === g.categoria_id)?.nombre,
      alojamiento: hotels.find((h) => h.id === g.alojamiento_id)?.nombre || 'Operación general',
    }));
  }
  async saveExpense(input: any, actor: any, id?: string) {
    return this.database.transaction(async (em) => {
      const previous = id ? await em.findOneBy<any>('gastos', { id }) : null;
      if (id && !previous) throw new NotFoundException('Gasto no encontrado');
      const value = { ...(previous || {}), ...input };
      if (!(await em.findOneBy('categorias_gasto', { id: value.categoria_id })))
        throw new BadRequestException('Categoría no válida');
      if (
        value.alojamiento_id &&
        !(await em.findOneBy('accommodations', { id: value.alojamiento_id }))
      )
        throw new BadRequestException('Alojamiento no válido');
      if (
        !value.fecha ||
        !Number.isFinite(Date.parse(value.fecha)) ||
        new Date(value.fecha).toISOString().slice(0, 10) !== value.fecha
      )
        throw new BadRequestException('La fecha no existe');
      if (!id) {
        value.id = randomUUID();
        value.fecha_creacion = now();
        value.actor_id = actor.id;
        value.alojamiento_id = value.alojamiento_id ?? null;
      }
      await em.save('gastos', value);
      await this.audit(em, actor, id ? 'GASTO_ACTUALIZADO' : 'GASTO_CREADO', value.id);
      return value;
    });
  }
  async removeExpense(id: string, actor: any) {
    return this.database.transaction(async (em) => {
      if (!(await em.findOneBy('gastos', { id })))
        throw new NotFoundException('Gasto no encontrado');
      await em.delete('gastos', { id });
      await this.audit(em, actor, 'GASTO_ELIMINADO', id);
    });
  }
  async saveCategory(input: any, actor: any, id?: number) {
    return this.database.transaction(async (em) => {
      if (id && !(await em.findOneBy('categorias_gasto', { id })))
        throw new NotFoundException('Categoría no encontrada');
      const same = await em.findOneBy<any>('categorias_gasto', { nombre: input.nombre });
      if (same && same.id !== id) throw new ConflictException('La categoría ya existe');
      const result = await em.save<any, any>('categorias_gasto', {
        ...(id ? { id } : {}),
        nombre: input.nombre,
      });
      await this.audit(em, actor, 'CATEGORIA_GUARDADA', String(result.id));
      return result;
    });
  }
  async removeCategory(id: number, actor: any) {
    return this.database.transaction(async (em) => {
      if (await em.countBy('gastos', { categoria_id: id }))
        throw new ConflictException('La categoría tiene gastos asociados');
      if (!(await em.findOneBy('categorias_gasto', { id })))
        throw new NotFoundException('Categoría no encontrada');
      await em.delete('categorias_gasto', { id });
      await this.audit(em, actor, 'CATEGORIA_ELIMINADA', String(id));
    });
  }
  async saveCity(input: any, actor: any, id?: number) {
    return this.database.transaction(async (em) => {
      const old = id ? await em.findOneBy<any>('cities', { id }) : null;
      if (id && !old) throw new NotFoundException('Destino no encontrado');
      const value = { ...(old || {}), ...input, name: input.nombre ?? old?.name, country: 'ec' };
      delete value.nombre;
      const duplicate = await em.findOneBy<any>('cities', { codigo: value.codigo });
      if (duplicate && duplicate.id !== id)
        throw new ConflictException('Ya existe un destino con ese código cantonal');
      const result = await em.save<any, any>('cities', value);
      if (id) {
        await em.update('accommodations', { cityId: id }, { destino: result.name });
      }
      await this.audit(em, actor, 'DESTINO_GUARDADO', String(result.id));
      return result;
    });
  }
  async removeCity(id: number, actor: any) {
    return this.database.transaction(async (em) => {
      if (await em.countBy('accommodations', { cityId: id }))
        throw new ConflictException('El destino tiene alojamientos; conserva su historial');
      if (!(await em.findOneBy('cities', { id })))
        throw new NotFoundException('Destino no encontrado');
      await em.delete('cities', { id });
      await this.audit(em, actor, 'DESTINO_ELIMINADO', String(id));
    });
  }
  async dashboard(start?: string, end?: string) {
    start = start || new Date().getUTCFullYear() + '-01-01';
    end = end || now().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      new Date(start).toISOString().slice(0, 10) !== start ||
      new Date(end).toISOString().slice(0, 10) !== end ||
      start > end
    )
      throw new BadRequestException('Período inválido');
    const em = this.database.db.manager;
    const [cities, hotels, orders, expenses, categories, users] = await Promise.all(
      ['cities', 'accommodations', 'orders', 'gastos', 'categorias_gasto', 'users'].map((table) =>
        em.find<any>(table),
      ),
    );
    return erpMetrics(cities, hotels, orders, expenses, categories, users, start, end);
  }
}
