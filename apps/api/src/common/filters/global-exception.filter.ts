import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const requestId =
      request.headers['x-request-id'] || request.id || 'unknown';

    // Structured logging
    this.logger.error(
      `[${request.method}] ${request.url} - ${status} - RequestID: ${requestId} - ${typeof message === 'object' ? JSON.stringify(message) : message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body =
      typeof message === 'object' && message !== null
        ? (message as Record<string, unknown>)
        : null;

    // `errorCode` is a stable machine-readable discriminator clients branch on
    // (e.g. the mobile register+retry on UNTRUSTED_DEVICE). It must survive
    // this filter — the response previously kept only `message`, so any code a
    // handler attached was silently dropped and clients were forced to match
    // on human-readable text.
    const errorCode =
      body && typeof body['errorCode'] === 'string'
        ? (body['errorCode'] as string)
        : undefined;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(errorCode ? { errorCode } : {}),
      message: body && 'message' in body ? body['message'] : message,
    });
  }
}
