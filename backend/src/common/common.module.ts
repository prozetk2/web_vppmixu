import { Module, Global } from '@nestjs/common';
import { ExcelService } from './services/excel.service';

@Global()
@Module({
    providers: [ExcelService],
    exports: [ExcelService],
})
export class CommonModule { }
