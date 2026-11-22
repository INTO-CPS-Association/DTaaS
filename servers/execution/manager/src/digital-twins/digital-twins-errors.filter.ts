import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import {
  DigitalTwinError,
  type DigitalTwinErrorCode,
} from './digital-twins.errors.js';

type JsonResponse = {
  status(code: number): { json(body: unknown): unknown };
};

const HTTP_ANSWERS: Record<
  DigitalTwinErrorCode,
  { status: HttpStatus; error: string }
> = {
  'digital-twin-not-found': {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
  },
  'execution-not-found': { status: HttpStatus.NOT_FOUND, error: 'Not Found' },
  'gitlab-failure': { status: HttpStatus.BAD_GATEWAY, error: 'Bad Gateway' },
};

@Catch(DigitalTwinError)
export default class DigitalTwinsErrorsFilter implements ExceptionFilter {
  catch(exception: DigitalTwinError, host: ArgumentsHost): void {
    const { status, error } = HTTP_ANSWERS[exception.code];
    host.switchToHttp().getResponse<JsonResponse>().status(status).json({
      statusCode: status,
      message: exception.message,
      error,
    });
  }
}
