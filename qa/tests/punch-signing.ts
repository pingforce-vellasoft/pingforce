import {
  generateKeyPairSync,
  randomUUID,
  sign,
  type KeyObject,
} from 'node:crypto';

/**
 * A synthetic handset: an Ed25519 key pair and the canonical punch payload
 * the API verifies (apps/api/src/attendance/punch-signature.service.ts).
 */
export interface Handset {
  readonly deviceId: string;
  readonly publicKey: string;
  readonly privateKey: KeyObject;
}

export function newHandset(): Handset {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  // SPKI DER for Ed25519 is a 12-byte prefix followed by the raw 32-byte key.
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(12);
  return {
    deviceId: `qa-handset-${randomUUID()}`,
    publicKey: `ed25519:${raw.toString('base64')}`,
    privateKey,
  };
}

export interface PunchFields {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy?: number;
  readonly isMockLocation?: boolean;
  readonly biometricVerified?: boolean;
  readonly timestamp?: string;
}

/** Signed body for POST /attendance/punch. */
export function signedPunch(handset: Handset, fields: PunchFields) {
  const body = {
    deviceId: handset.deviceId,
    timestamp: fields.timestamp ?? new Date().toISOString(),
    latitude: fields.latitude,
    longitude: fields.longitude,
    accuracy: fields.accuracy ?? 8,
    isMockLocation: fields.isMockLocation ?? false,
    biometricVerified: fields.biometricVerified ?? true,
  };
  const canonical = [
    'pingforce-attendance-v1',
    body.deviceId,
    body.timestamp,
    body.latitude.toFixed(7),
    body.longitude.toFixed(7),
    body.accuracy.toFixed(2),
    body.isMockLocation ? '1' : '0',
    body.biometricVerified ? '1' : '0',
    '',
  ].join('\n');
  const signature = sign(
    null,
    Buffer.from(canonical, 'utf8'),
    handset.privateKey,
  );
  return { ...body, signature: signature.toString('base64') };
}
