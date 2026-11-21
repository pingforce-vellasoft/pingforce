import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { resolveRequestId } from '../request-id';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = resolveRequestId(request, response);
    this.logger.error(
      `${exception.code} - RequestID: ${requestId} - ${exception.message.replace(/\n/g, ' ')}`,
    );

    const [status, message, error] =
      exception.code === 'P2002'
        ? [
            HttpStatus.CONFLICT,
            'A record with this unique value already exists.',
            'Conflict',
          ]
        : exception.code === 'P2025'
          ? [
              HttpStatus.NOT_FOUND,
              'The requested record was not found.',
              'Not Found',
            ]
          : [
              HttpStatus.INTERNAL_SERVER_ERROR,
              'Internal server error',
              'Internal Server Error',
            ];

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      message,
      error,
    });
  }
}
