import { Logger } from '@nestjs/common';
import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';
import { messages } from '@nestjs/core/constants';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception';

export class RpcExceptionsHandler {
  private static readonly logger = new Logger(RpcExceptionsHandler.name);
  private filters: RpcExceptionFilterMetadata[] = [];

  public handle(
    exception: Error | RpcException | any,
    host: ArgumentsHost,
  ): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception, host);
    if (filterResult$) {
      return filterResult$;
    }
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      const errorMessage = messages.UNKNOWN_EXCEPTION_MESSAGE;

      const isError = isObject(exception) && (exception as Error).message;
      const loggerArgs = isError
        ? [(exception as Error).message, (exception as Error).stack]
        : [exception];
      const logger = RpcExceptionsHandler.logger;
      logger.error.apply(logger, loggerArgs);

      return _throw({ status, message: errorMessage });
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
    return _throw(message);
  }

  public setCustomFilters(filters: RpcExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(
    exception,
    host: ArgumentsHost,
  ): Observable<any> | null {
    if (isEmpty(this.filters)) return null;

    const filter = this.filters.find(({ exceptionMetatypes, func }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        !!exceptionMetatypes.find(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    return filter ? filter.func(exception, host) : null;
  }
}
