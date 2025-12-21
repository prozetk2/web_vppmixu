import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map((data) => this.transform(data)));
    }

    private transform(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data === 'bigint') {
            return data.toString();
        }

        if (data instanceof Decimal) {
            // Convert Prisma Decimal to number for API consumers (keep precision from DB)
            return data.toNumber();
        }

        // Handle Date objects - convert to ISO string
        if (data instanceof Date) {
            return data.toISOString();
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.transform(item));
        }

        if (typeof data === 'object') {
            return Object.keys(data).reduce((acc, key) => {
                acc[key] = this.transform(data[key]);
                return acc;
            }, {});
        }

        return data;
    }
}
