import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface JwtKeyConfig {
  key: string;
  algorithm: 'RS256' | 'HS256';
}

/**
 * Resolution order for both keys (first hit wins):
 *   1. JWT_{PRIVATE,PUBLIC}_KEY      — inline PEM, literal \n accepted
 *   2. JWT_{PRIVATE,PUBLIC}_KEY_PATH — explicit file path
 *   3. JWT_KEYS_DIR/{private,public}.pem
 *   4. <cwd>/{private,public}.pem    — local dev fallback
 *
 * Containers use (3): the deploy stack mounts a persistent `jwt_keys` volume at
 * /app/keys and generates the pair once, so pulling a new image or recreating
 * the container never loses the keys. Rotating them invalidates every issued
 * access and refresh token — all sessions must re-login.
 */
@Injectable()
export class JwtConfigService {
  private privateKeyConfig?: JwtKeyConfig;
  private publicKeyConfig?: JwtKeyConfig;

  getPrivateKey(): JwtKeyConfig {
    this.privateKeyConfig ??= this.resolve('private');
    return this.privateKeyConfig;
  }

  getPublicKey(): JwtKeyConfig {
    this.publicKeyConfig ??= this.resolve('public');
    return this.publicKeyConfig;
  }

  private resolve(kind: 'private' | 'public'): JwtKeyConfig {
    const envName = kind === 'private' ? 'JWT_PRIVATE_KEY' : 'JWT_PUBLIC_KEY';

    const inline = process.env[envName];
    if (inline) {
      return { key: inline.replace(/\\n/g, '\n'), algorithm: 'RS256' };
    }

    const candidates = [
      process.env[`${envName}_PATH`],
      process.env.JWT_KEYS_DIR
        ? path.join(process.env.JWT_KEYS_DIR, `${kind}.pem`)
        : undefined,
      path.join(process.cwd(), `${kind}.pem`),
    ].filter((p): p is string => !!p);

    for (const candidate of candidates) {
      try {
        return {
          key: fs.readFileSync(candidate, 'utf8'),
          algorithm: 'RS256',
        };
      } catch {
        // Try the next candidate; only exhausting all of them is fatal.
      }
    }

    throw new Error(
      `FATAL: no JWT ${kind} key found. Set ${envName}, ${envName}_PATH, or ` +
        `JWT_KEYS_DIR, or place ${kind}.pem in ${process.cwd()}. ` +
        `Searched: ${candidates.join(', ')}. Cannot start server securely!`,
    );
  }
}
