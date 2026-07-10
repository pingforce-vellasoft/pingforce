import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

@Injectable()
export class DatabaseRetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const maxRetries = 3;
    const retryDelay = 500; // ms

    return next.handle().pipe(
      retryWhen(errors => 
        errors.pipe(
          mergeMap((error, index) => {
            // Only retry for specific transient Prisma errors: 
            // P2024: A connection from the connection pool timed out
            // P2034: Transaction failed due to a write conflict or a deadlock.
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              (error.code === 'P2024' || error.code === 'P2034')
            ) {
              if (index < maxRetries) {
                return timer(retryDelay * Math.pow(2, index)); // Exponential backoff
              }
              return throwError(() => new RequestTimeoutException('Database is currently overloaded. Please try again.'));
            }
            
            // For all other errors, throw immediately (don't retry)
            return throwError(() => error);
          })
        )
      )
    );
  }
}
