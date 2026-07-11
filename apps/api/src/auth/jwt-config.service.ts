import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface JwtKeyConfig {
  key: string;
  algorithm: 'RS256' | 'HS256';
}

@Injectable()
export class JwtConfigService {
  private privateKeyConfig?: JwtKeyConfig;
  private publicKeyConfig?: JwtKeyConfig;

  getPrivateKey(): JwtKeyConfig {
    if (this.privateKeyConfig) return this.privateKeyConfig;

    if (process.env.JWT_PRIVATE_KEY) {
      this.privateKeyConfig = {
        key: process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        algorithm: 'RS256',
      };
      return this.privateKeyConfig;
    }

    try {
      const key = fs.readFileSync(
        path.join(process.cwd(), 'private.pem'),
        'utf8',
      );
      this.privateKeyConfig = { key, algorithm: 'RS256' };
    } catch (e) {
      throw new Error(
        'FATAL: private.pem not found and JWT_PRIVATE_KEY not set in environment. Cannot start server securely!',
      );
    }
    return this.privateKeyConfig;
  }

  getPublicKey(): JwtKeyConfig {
    if (this.publicKeyConfig) return this.publicKeyConfig;

    if (process.env.JWT_PUBLIC_KEY) {
      this.publicKeyConfig = {
        key: process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
        algorithm: 'RS256',
      };
      return this.publicKeyConfig;
    }

    try {
      const key = fs.readFileSync(
        path.join(process.cwd(), 'public.pem'),
        'utf8',
      );
      this.publicKeyConfig = { key, algorithm: 'RS256' };
    } catch (e) {
      throw new Error(
        'FATAL: public.pem not found and JWT_PUBLIC_KEY not set in environment. Cannot start server securely!',
      );
    }
    return this.publicKeyConfig;
  }
}
