import { BadRequestException, Injectable } from '@nestjs/common';
import { createPublicKey, verify } from 'crypto';

export interface SignedPunchPayload {
  readonly deviceId: string;
  readonly timestamp: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy?: number;
  readonly isMockLocation?: boolean;
  readonly biometricVerified?: boolean;
  readonly clientRef?: string;
  readonly signature: string;
}

/**
 * Verifies an Ed25519 signature produced by the bound handset.
 *
 * The payload is deliberately canonical and versioned. Coordinates are rounded
 * only for signing so JSON number formatting differences cannot invalidate a
 * legitimate punch; the original values are still stored.
 */
@Injectable()
export class PunchSignatureService {
  static canonical(payload: Omit<SignedPunchPayload, 'signature'>): string {
    return [
      'pingforce-attendance-v1',
      payload.deviceId,
      payload.timestamp,
      payload.latitude.toFixed(7),
      payload.longitude.toFixed(7),
      (payload.accuracy ?? 0).toFixed(2),
      payload.isMockLocation === true ? '1' : '0',
      payload.biometricVerified === true ? '1' : '0',
      payload.clientRef ?? '',
    ].join('\n');
  }

  verify(publicKey: string, payload: SignedPunchPayload): void {
    if (!publicKey.startsWith('ed25519:')) {
      throw new BadRequestException({
        errorCode: 'DEVICE_KEY_UPGRADE_REQUIRED',
        message:
          'This device must refresh its security key before attendance can be recorded.',
      });
    }

    try {
      const publicKeyBytes = Buffer.from(publicKey.slice(8), 'base64');
      const signatureBytes = Buffer.from(payload.signature, 'base64');
      if (publicKeyBytes.length !== 32 || signatureBytes.length !== 64) {
        throw new Error('invalid Ed25519 key or signature length');
      }

      // RFC 8410 SubjectPublicKeyInfo prefix for a raw 32-byte Ed25519 key.
      const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
      const key = createPublicKey({
        key: Buffer.concat([spkiPrefix, publicKeyBytes]),
        format: 'der',
        type: 'spki',
      });
      const { signature, ...unsigned } = payload;
      const valid = verify(
        null,
        Buffer.from(PunchSignatureService.canonical(unsigned), 'utf8'),
        key,
        signatureBytes,
      );
      if (!valid) throw new Error('signature mismatch');
    } catch {
      throw new BadRequestException({
        errorCode: 'INVALID_DEVICE_SIGNATURE',
        message: 'The attendance punch signature is invalid.',
      });
    }
  }
}
