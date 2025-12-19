const XLSX = require('xlsx');

const filePath = './DanhSachKhachHang_KV17122025-034701-601.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    // Find header row
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i]?.map((c) => String(c || '').toLowerCase().trim()) || [];
        if (row.some((c) => c.includes('tên') || c.includes('name') || c.includes('khách'))) {
            headerIdx = i;
            break;
        }
    }

    const headers = jsonData[headerIdx]?.map((h) => String(h || '').toLowerCase().trim()) || [];

    console.log('=== HEADERS ===');
    console.log('Total columns:', headers.length);
    headers.forEach((h, idx) => {
        console.log(`${idx}: "${h}"`);
    });

    console.log('\n=== FIRST DATA ROW ===');
    const firstDataRow = jsonData[headerIdx + 1];
    if (firstDataRow) {
        headers.forEach((h, idx) => {
            const val = firstDataRow[idx];
            const valType = typeof val;
            console.log(`${h}: ${JSON.stringify(val)} (${valType})`);
        });
    }

    console.log('\n=== PARSED CUSTOMER SAMPLE ===');
    const row = firstDataRow;
    const customer = {};

    headers.forEach((h, idx) => {
        const val = row[idx];
        if (val === null || val === undefined || val === '') return;

        const strVal = String(val).trim();

        // Map các cột theo tên chính xác từ Excel
        if (h.includes('loại khách')) {
            customer.customerType = strVal;
        }
        else if (h.includes('chi nhánh')) {
            customer.branch = strVal;
        }
        else if (h.includes('mã khách')) {
            customer.code = strVal;
        }
        else if (h.includes('tên khách')) {
            customer.name = strVal;
        }
        else if (h.includes('điện thoại')) {
            customer.phone = strVal;
        }
        else if (h.includes('địa chỉ') && !h.includes('khu vực')) {
            customer.address = strVal;
        }
        else if (h.includes('khu vực giao')) {
            customer.deliveryArea = strVal;
        }
        else if (h.includes('phường') || h.includes('xã')) {
            customer.ward = strVal;
        }
        else if (h.includes('công ty') && !h.includes('mã số')) {
            customer.company = strVal;
        }
        else if (h.includes('mã số thuế')) {
            customer.taxNumber = strVal;
        }
        else if (h.includes('cmnd') || h.includes('cccd')) {
            customer.idNumber = strVal;
        }
        else if (h.includes('ngày sinh')) {
            customer.birthDate = strVal;
        }
        else if (h.includes('giới tính')) {
            customer.gender = strVal;
        }
        else if (h.includes('email')) {
            customer.email = strVal;
        }
        else if (h.includes('facebook')) {
            customer.facebook = strVal;
        }
        else if (h.includes('nhóm khách')) {
            customer.customerGroup = strVal;
        }
        else if (h.includes('ghi chú')) {
            customer.notes = strVal;
        }
        else if (h.includes('người tạo')) {
            customer.creator = strVal;
        }
        else if (h.includes('ngày giao dịch cuối')) {
            customer.lastTransaction = strVal;
        }
        else if (h.includes('số ngày nợ')) {
            const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) customer.debtDays = num;
        }
        else if (h.includes('nợ cần thu') || h.includes('nợ hiện tại')) {
            const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) customer.currentDebt = num;
        }
        else if (h.includes('tổng bán') && !h.includes('trừ')) {
            const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) customer.totalSales = num;
        }
        else if (h.includes('tổng bán trừ')) {
            const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) customer.totalSalesAfterReturn = num;
        }
        else if (h.includes('trạng thái')) {
            customer.status = strVal;
        }
    });

    console.log(JSON.stringify(customer, null, 2));

    console.log('\n=== TOTAL ROWS ===');
    console.log('Total data rows:', jsonData.length - headerIdx - 1);

} catch (error) {
    console.error('Error:', error.message);
}
