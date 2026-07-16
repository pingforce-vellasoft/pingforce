import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';
import type { Readable } from 'stream';

export type StorageProvider = 'LOCAL' | 'OBJECT_STORAGE';

const UPLOADS_ROOT = resolve(process.cwd(), 'uploads');

/**
 * Physical byte storage behind file uploads (Storage.md §7, Upload.md §7).
 * Env-gated driver selection:
 * - OBJECT_STORAGE_ENDPOINT set → S3-compatible object storage via the MinIO
 *   client (local MinIO container in dev, OCI Object Storage's S3-compat
 *   endpoint in production — credentials mounted from OCI Vault).
 * - otherwise → local disk under uploads/ (development fallback).
 *
 * Keys are always tenant-prefixed (`<tenantId>/<uuid>.<ext>`) so object
 * listings and lifecycle rules can be tenant-scoped.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client | null = null;
  private readonly bucket: string;
  private bucketReady = false;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>(
      'OBJECT_STORAGE_BUCKET',
      'pingforce-files',
    );

    const endpoint = config.get<string>('OBJECT_STORAGE_ENDPOINT');
    if (!endpoint) {
      this.logger.warn(
        'OBJECT_STORAGE_ENDPOINT not set — files stored on local disk (uploads/)',
      );
      return;
    }

    try {
      this.client = new Minio.Client({
        endPoint: endpoint,
        port: parseInt(config.get<string>('OBJECT_STORAGE_PORT', '9000'), 10),
        useSSL: config.get<string>('OBJECT_STORAGE_USE_SSL') === 'true',
        accessKey: config.get<string>('OBJECT_STORAGE_ACCESS_KEY', ''),
        secretKey: config.get<string>('OBJECT_STORAGE_SECRET_KEY', ''),
      });
      this.logger.log(
        `Object storage configured (${endpoint}, bucket ${this.bucket})`,
      );
    } catch (error) {
      this.logger.error(
        `Object storage init failed, falling back to local disk: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  get provider(): StorageProvider {
    return this.client ? 'OBJECT_STORAGE' : 'LOCAL';
  }

  private async ensureBucket(client: Minio.Client): Promise<void> {
    if (this.bucketReady) return;
    if (!(await client.bucketExists(this.bucket))) {
      await client.makeBucket(this.bucket);
    }
    this.bucketReady = true;
  }

  /** Resolves a storage key under uploads/, rejecting path traversal. */
  private localPath(storageKey: string): string {
    const absolutePath = resolve(join(UPLOADS_ROOT, storageKey));
    if (!absolutePath.startsWith(UPLOADS_ROOT + sep)) {
      throw new NotFoundException('File not found');
    }
    return absolutePath;
  }

  /** Persists bytes and returns the provider they were written to. */
  async put(
    storageKey: string,
    data: Buffer,
    mimeType: string,
  ): Promise<StorageProvider> {
    if (this.client) {
      await this.ensureBucket(this.client);
      await this.client.putObject(this.bucket, storageKey, data, data.length, {
        'Content-Type': mimeType,
      });
      return 'OBJECT_STORAGE';
    }

    const absolutePath = this.localPath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);
    return 'LOCAL';
  }

  /**
   * Opens a read stream for a stored object. The provider recorded on the
   * metadata row wins over the currently configured driver, so files
   * uploaded before an object-storage migration stay downloadable.
   */
  async getStream(
    storageKey: string,
    provider: StorageProvider,
  ): Promise<Readable> {
    if (provider === 'OBJECT_STORAGE') {
      if (!this.client) {
        throw new NotFoundException(
          'File is in object storage but no object storage is configured',
        );
      }
      try {
        return await this.client.getObject(this.bucket, storageKey);
      } catch {
        throw new NotFoundException('File not found');
      }
    }

    const absolutePath = this.localPath(storageKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File not found');
    }
    return createReadStream(absolutePath);
  }

  /** Deletes the physical bytes; missing objects are treated as already gone. */
  async delete(storageKey: string, provider: StorageProvider): Promise<void> {
    try {
      if (provider === 'OBJECT_STORAGE') {
        if (this.client) {
          await this.client.removeObject(this.bucket, storageKey);
        }
        return;
      }
      const absolutePath = this.localPath(storageKey);
      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to delete stored bytes for ${storageKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
