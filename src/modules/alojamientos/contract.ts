import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BadRequestException } from '@nestjs/common';
export const apiContract = parse(readFileSync(join(process.cwd(), 'contracts/kawsay-estancias-openapi.yaml'), 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
// Los mismos esquemas del contrato propio se publican y se usan para validar.
const root = { $id: 'kawsay', components: apiContract.components };
ajv.addSchema(root);
const validators = new Map();
export function validateContract(name: string, body: any) {
  if (!validators.has(name)) validators.set(name, ajv.compile({ $ref: 'kawsay#/components/schemas/' + name }));
  const validate = validators.get(name);
  if (!validate(body)) throw new BadRequestException({ message: 'El cuerpo no cumple el contrato', errors: validate.errors });
}
