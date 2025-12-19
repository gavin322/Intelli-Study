import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt;
        const actor = user ? `user:${user.id}` : 'guest';
        this.logger.log(`${method} ${url} ${actor} - ${duration}ms`);
      })
    );
  }
}
