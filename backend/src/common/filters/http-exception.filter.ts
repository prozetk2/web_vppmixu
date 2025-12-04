import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = res;
      } else if (res && typeof res === 'object') {
        const { message: resMessage, error: resError, ...rest } = res as Record<string, unknown>;
        message = Array.isArray(resMessage) ? resMessage.join(', ') : (resMessage as string) ?? message;
        code = (resError as string) ?? (typeof resMessage === 'string' ? (resMessage as string) : code);
        details = Object.keys(rest).length ? rest : undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      error: { code, message, details },
      meta: { path: request.url, timestamp: new Date().toISOString() },
    });
  }
}
