import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

function mapStatusToCode(statusCode: number) {
  if (statusCode === HttpStatus.BAD_REQUEST) return 'BAD_REQUEST';
  if (statusCode === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
  if (statusCode === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
  if (statusCode === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (statusCode === HttpStatus.CONFLICT) return 'CONFLICT';
  if (statusCode >= 500) return 'INTERNAL_SERVER_ERROR';
  return 'HTTP_ERROR';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan internal';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const typed = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(typed.message)) {
          message = 'Validasi request gagal';
          details = typed.message;
        } else if (typeof typed.message === 'string') {
          message = typed.message;
        } else if (typeof typed.error === 'string') {
          message = typed.error;
        }
      }
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: mapStatusToCode(statusCode),
        statusCode,
        message,
        details,
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
