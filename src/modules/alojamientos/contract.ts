import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BadRequestException } from '@nestjs/common';
export const originalContract = parse(readFileSync(join(process.cwd(), 'contracts/alojamientos-openapi.yaml'), 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
// Register the entire schema namespace so the original local $refs stay valid.
const root = { $id: 'booking', components: originalContract.components };
ajv.addSchema(root);
const validators = new Map();
export function validateContract(name: string, body: any) {
  if (!validators.has(name)) validators.set(name, ajv.compile({ $ref: 'booking#/components/schemas/' + name }));
  const validate = validators.get(name);
  if (!validate(body)) throw new BadRequestException({ message: 'El cuerpo no cumple el contrato', errors: validate.errors });
}
