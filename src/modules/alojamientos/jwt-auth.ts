import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { sign, verify, JwtPayload } from 'jsonwebtoken';

@Injectable()
export class JwtAuth {
  private readonly secret: string;
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (
      (process.env.VERCEL || process.env.NODE_ENV === 'production') &&
      (!secret || secret.length < 32)
    )
      throw new Error('JWT_SECRET debe ser un secreto privado de al menos 32 caracteres');
    this.secret = secret || 'booking-development-only-key-never-use-in-production';
  }
  issue(user: { id: string; role: string }) {
    return sign({ role: user.role }, this.secret, {
      algorithm: 'HS256',
      subject: user.id,
      jwtid: randomUUID(),
      issuer: 'booking-prototipo',
      audience: 'booking-web',
      expiresIn: '1h',
    });
  }
  verify(token: string): JwtPayload {
    try {
      const claims = verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: 'booking-prototipo',
        audience: 'booking-web',
      });
      if (
        typeof claims === 'string' ||
        !claims.sub ||
        !claims.jti ||
        !claims.exp ||
        !['admin', 'customer'].includes(claims.role)
      )
        throw new Error('Claims inválidos');
      return claims;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido; inicia sesión');
    }
  }
}
