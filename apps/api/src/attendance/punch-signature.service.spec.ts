import { generateKeyPairSync, sign } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import {
  PunchSignatureService,
  SignedPunchPayload,
} from './punch-signature.service';

describe('PunchSignatureService', () => {
  const service = new PunchSignatureService();

  function signedPayload(): { payload: SignedPunchPayload; publicKey: string } {
    const pair = generateKeyPairSync('ed25519');
    const rawPublic = pair.publicKey
      .export({ format: 'der', type: 'spki' })
      .subarray(-32);
    const unsigned = {
      deviceId: 'dev-12345678',
      timestamp: '2026-09-14T07:00:00.000Z',
      latitude: 12.9715987,
      longitude: 77.594566,
      accuracy: 8.25,
      isMockLocation: false,
      biometricVerified: true,
      clientRef: '',
    };
    const signature = sign(
      null,
      Buffer.from(PunchSignatureService.canonical(unsigned), 'utf8'),
      pair.privateKey,
    ).toString('base64');
    return {
      payload: { ...unsigned, signature },
      publicKey: `ed25519:${rawPublic.toString('base64')}`,
    };
  }

  it('accepts a valid signature', () => {
    const { payload, publicKey } = signedPayload();
    expect(() => service.verify(publicKey, payload)).not.toThrow();
  });

  it('rejects a modified coordinate', () => {
    const { payload, publicKey } = signedPayload();
    expect(() =>
      service.verify(publicKey, { ...payload, latitude: payload.latitude + 1 }),
    ).toThrow(BadRequestException);
  });

  it('requires legacy devices to upgrade their key', () => {
    const { payload } = signedPayload();
    expect(() => service.verify('mobile-client', payload)).toThrow(
      BadRequestException,
    );
  });
});
