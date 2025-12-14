import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ExcelRow {
    [key: string]: any;
}

@Injectable()
export class ExcelService {
    /**
     * Parse Excel file buffer and return array of objects
     */
    parseExcelFile(buffer: Buffer, sheetName?: string): ExcelRow[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = sheetName
            ? workbook.Sheets[sheetName]
            : workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
            throw new Error('Sheet not found');
        }

        const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);
        return data;
    }

    /**
     * Validate required fields in Excel data
     */
    validateRequiredFields(data: ExcelRow[], requiredFields: string[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        data.forEach((row, index) => {
            requiredFields.forEach(field => {
                if (!row[field] || row[field].toString().trim() === '') {
                    errors.push(`Row ${index + 2}: Missing required field "${field}"`);
                }
            });
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Create Excel template with headers
     */
    createTemplate(headers: string[], sheetName: string = 'Sheet1'): Buffer {
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    }
}
