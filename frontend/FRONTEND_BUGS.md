# 🐛 Frontend Bugs Report

**Branch:** `codex/fixbugwithvienbb`  
**Ngày quét:** 18/04/2026  
**Tổng số bugs:** 10

---

## 📊 Tổng quan

| Mức độ | Số lượng | Cần fix ngay |
|--------|----------|--------------|
| 🔴 Critical | 2 | ✅ YES |
| ⚠️ High | 3 | ✅ YES |
| 🟡 Medium | 4 | ⚠️ Nên fix |
| 🟢 Low | 1 | 💡 Có thể để sau |

---

## 🔴 CRITICAL BUGS (Cần fix ngay)

### BUG #1: Duplicate Placeholder (Syntax Error)

**File:** `frontend/src/components/customers/CustomerList.tsx`  
**Line:** 1656-1658

**Code hiện tại:**
```tsx
<input
    type="text"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    className="form-input"
    placeholder="0xxx xxx xxx"
    placeholder="0xxx xxx xxx"  // ❌ Duplicate
    placeholder="0xxx xxx xxx"  // ❌ Duplicate
/>
```

**Vấn đề:**
- Có 3 placeholder giống nhau
- Code không hợp lệ
- Có thể gây lỗi khi build

**Tác động:**
- ❌ Code không compile được (nếu strict mode)
- ❌ Unprofessional

**Cách fix:**
```tsx
<input
    type="text"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    className="form-input"
    placeholder="0xxx xxx xxx"
/>
```

**Độ ưu tiên:** 🔴 **CRITICAL** - Fix ngay

---

### BUG #2: Memory Leak - useEffect Dependencies

**File:** `frontend/src/components/customers/PaymentModal.tsx`  
**Line:** 66-80

**Code hiện tại:**
```typescript
useEffect(() => {
    if (isOpen) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16);
        setPaymentDate(dateStr);
        setAmount(0);
        setNote('');
        setAllocateToInvoices(outstandingInvoices.length > 0);

        const allocs: Record<string, number> = {};
        outstandingInvoices.forEach((inv) => {
            allocs[inv.id] = 0;
        });
        setAllocations(allocs);
    }
}, [isOpen, invoices]); // ❌ invoices thay đổi liên tục!
```

**Vấn đề:**
- `invoices` array reference thay đổi mỗi lần parent component re-render
- useEffect chạy lại không cần thiết
- Tạo allocations object mới liên tục → memory leak

**Tác động:**
- ⚠️ Performance chậm dần sau nhiều lần mở/đóng modal
- ⚠️ Memory usage tăng
- ⚠️ Browser có thể lag

**Cách fix:**
```typescript
useEffect(() => {
    if (!isOpen) return;
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16);
    setPaymentDate(dateStr);
    setAmount(0);
    setNote('');
    
    // Calculate outstanding invoices inside effect
    const outstanding = invoices.filter((invoice) => 
        resolveInvoiceAmountDue(invoice) > 0
    );
    
    setAllocateToInvoices(outstanding.length > 0);

    const allocs: Record<string, number> = {};
    outstanding.forEach((inv) => {
        allocs[inv.id] = 0;
    });
    setAllocations(allocs);
}, [isOpen]); // ✅ Chỉ depend vào isOpen
```

**Độ ưu tiên:** 🔴 **CRITICAL** - Fix ngay

---

## ⚠️ HIGH PRIORITY BUGS

### BUG #3: Console.log Trong Production Code

**Files:** 15+ files

**Các file chính:**
- `frontend/src/components/invoices/InvoiceList.tsx` (line 302, 317, 320)
- `frontend/src/components/dashboard/DashboardOverview.tsx` (line 137, 191, 251)
- `frontend/src/components/customers/CustomerList.tsx` (line 635, 697, 701)
- `frontend/src/components/products/ProductList.tsx` (line 268, 288, 336)
- `frontend/src/components/inventory/InventoryOverview.tsx` (nhiều chỗ)
- `frontend/src/components/sales/POSPage.tsx` (line 1586, 1587, 1595)
- `frontend/src/components/suppliers/SupplierList.tsx` (line 405, 1139)

**Ví dụ:**
```typescript
// InvoiceList.tsx
console.log('Date range:', dateRange); // Debug log
console.log('Fetching invoices with params:', params); // Debug log
console.log('Received invoices:', data.length); // Debug log

// CustomerList.tsx
console.log('Total parsed customers:', parsedCustomers.length);
console.log('First customer sample:', parsedCustomers[0]);
console.log('Updating customer:', existing.code || existing.name);
```

**Vấn đề:**
- Debug logs còn trong production code
- Lộ thông tin nhạy cảm trong browser console
- Performance overhead

**Tác động:**
- ⚠️ Security risk - lộ data structure
- ⚠️ Performance chậm
- ⚠️ Unprofessional

**Cách fix:**

**Option 1:** Xóa tất cả console.log
```bash
# Tìm tất cả console.log
grep -r "console.log" frontend/src/components/

# Xóa thủ công hoặc dùng script
```

**Option 2:** Dùng proper logger
```typescript
// utils/logger.ts
export const logger = {
    log: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        console.error(...args); // Always log errors
    }
};

// Sử dụng
import { logger } from '@/utils/logger';
logger.log('Debug info'); // Chỉ log trong dev
```

**Độ ưu tiên:** ⚠️ **HIGH** - Fix trước khi deploy production

---

### BUG #4: Không Validate Payment Date

**File:** `frontend/src/components/customers/PaymentModal.tsx`  
**Line:** 340+

**Code hiện tại:**
```typescript
const handleSubmit = async (printAfter: boolean = false) => {
    if (amount <= 0) {
        alert('Vui lòng nhập số tiền thanh toán');
        return;
    }

    if (effectiveCurrentDebt > 0 && amount > effectiveCurrentDebt) {
        alert('Số tiền thanh toán không được vượt quá số nợ cần thu.');
        return;
    }
    
    // ❌ Không validate payment date!
    
    setLoading(true);
    try {
        const response = await customersAPI.payDebt(customerId, {
            amount,
            paymentMethod,
            collector,
            note,
            allocateToInvoices,
            createdAt: paymentDate ? new Date(paymentDate).toISOString() : undefined,
            // ...
        });
```

**Vấn đề:**
- User có thể chọn payment date trong tương lai
- Không validate date hợp lệ
- Data không đúng logic nghiệp vụ

**Tác động:**
- ⚠️ Báo cáo sai
- ⚠️ Data không hợp lý
- ⚠️ Khó audit

**Cách fix:**
```typescript
const handleSubmit = async (printAfter: boolean = false) => {
    if (amount <= 0) {
        alert('Vui lòng nhập số tiền thanh toán');
        return;
    }

    if (effectiveCurrentDebt > 0 && amount > effectiveCurrentDebt) {
        alert('Số tiền thanh toán không được vượt quá số nợ cần thu.');
        return;
    }

    // ✅ Validate payment date
    if (paymentDate) {
        const paymentDateObj = new Date(paymentDate);
        const now = new Date();
        
        if (isNaN(paymentDateObj.getTime())) {
            alert('Thời gian thanh toán không hợp lệ');
            return;
        }
        
        if (paymentDateObj > now) {
            alert('Thời gian thanh toán không được ở tương lai');
            return;
        }
        
        // Optional: Check if too far in the past (e.g., > 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (paymentDateObj < oneYearAgo) {
            const confirm = window.confirm(
                'Thời gian thanh toán cách đây hơn 1 năm. Bạn có chắc chắn?'
            );
            if (!confirm) return;
        }
    }

    setLoading(true);
    // ... rest of code
```

**Độ ưu tiên:** ⚠️ **HIGH** - Fix trước khi deploy

---

### BUG #5: Floating Point Comparison

**File:** `frontend/src/components/customers/PaymentModal.tsx`  
**Line:** 145

**Code hiện tại:**
```typescript
if (allocateToInvoices && outstandingInvoices.length > 0 && Math.abs(getUnallocated()) > 0.001) {
    alert('Vui lòng phân bổ hết số tiền thu vào các hóa đơn.');
    return;
}
```

**Vấn đề:**
- So sánh floating point với 0.001
- Với số tiền lớn (VD: 1,000,000,000 VND), 0.001 có thể không đủ chính xác
- JavaScript floating point có precision issues

**Tác động:**
- ⚠️ User không thể submit payment khi có lỗi làm tròn nhỏ
- ⚠️ UX không tốt

**Cách fix:**

**Option 1:** Round về integer
```typescript
const unallocated = Math.round(getUnallocated());
if (allocateToInvoices && outstandingInvoices.length > 0 && Math.abs(unallocated) > 0) {
    alert('Vui lòng phân bổ hết số tiền thu vào các hóa đơn.');
    return;
}
```

**Option 2:** Dùng epsilon phù hợp với scale
```typescript
const EPSILON = 1; // 1 VND tolerance
if (allocateToInvoices && outstandingInvoices.length > 0 && Math.abs(getUnallocated()) > EPSILON) {
    alert('Vui lòng phân bổ hết số tiền thu vào các hóa đơn.');
    return;
}
```

**Độ ưu tiên:** ⚠️ **HIGH** - Fix để cải thiện UX

---

## 🟡 MEDIUM PRIORITY BUGS

### BUG #6: Hardcoded Collector Options

**File:** `frontend/src/components/customers/PaymentModal.tsx`  
**Line:** 420-423

**Code hiện tại:**
```tsx
<div className="payment-form-group">
    <label>Người thu</label>
    <select value={collector} onChange={(e) => setCollector(e.target.value)}>
        <option value="Mixu">Mixu</option>
        <option value="Admin">Admin</option>
    </select>
</div>
```

**Vấn đề:**
- Hardcoded options
- Không flexible
- Khó maintain khi thêm/bớt người thu

**Tác động:**
- 🟡 Phải sửa code mỗi khi thay đổi nhân viên
- 🟡 Không scale

**Cách fix:**

**Option 1:** Load từ API
```typescript
const [collectors, setCollectors] = useState<string[]>(['Mixu', 'Admin']);

useEffect(() => {
    const fetchCollectors = async () => {
        try {
            const response = await settingsAPI.getCollectors();
            setCollectors(response.data || ['Mixu', 'Admin']);
        } catch (error) {
            console.error('Failed to load collectors:', error);
        }
    };
    fetchCollectors();
}, []);

// JSX
<select value={collector} onChange={(e) => setCollector(e.target.value)}>
    {collectors.map(name => (
        <option key={name} value={name}>{name}</option>
    ))}
</select>
```

**Option 2:** Load từ config file
```typescript
// config/collectors.ts
export const COLLECTORS = ['Mixu', 'Admin', 'Viên', 'Hùng'];

// PaymentModal.tsx
import { COLLECTORS } from '@/config/collectors';

<select value={collector} onChange={(e) => setCollector(e.target.value)}>
    {COLLECTORS.map(name => (
        <option key={name} value={name}>{name}</option>
    ))}
</select>
```

**Độ ưu tiên:** 🟡 **MEDIUM** - Nên fix để dễ maintain

---

### BUG #7: Excel Date Bug Handling Không Đúng

**File:** `frontend/src/components/customers/CustomerList.tsx`  
**Line:** 747

**Code hiện tại:**
```typescript
// Excel epoch starts at 1900-01-01
const excelEpoch = new Date(1900, 0, 1);
const days = num - 2; // Excel has a bug with leap year 1900, so subtract 2
const jsDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
```

**Vấn đề:**
- Comment nói "Excel has a bug with leap year 1900"
- Nhưng chỉ trừ 2 cho TẤT CẢ dates
- Không handle edge case đúng
- Excel bug chỉ ảnh hưởng dates sau 1900-02-28

**Tác động:**
- 🟡 Dates trước 1900-03-01 sẽ sai 1 ngày
- 🟡 Import Excel có thể sai date

**Cách fix:**
```typescript
// Excel epoch starts at 1900-01-01
const excelEpoch = new Date(1900, 0, 1);

// Excel incorrectly treats 1900 as a leap year
// For dates after Feb 28, 1900 (serial > 60), subtract 2
// For dates before (serial <= 60), subtract 1
const days = num > 60 ? num - 2 : num - 1;

const jsDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
```

**Hoặc dùng library:**
```typescript
import { excelDateToJSDate } from '@/utils/excel';

const jsDate = excelDateToJSDate(num);
```

**Độ ưu tiên:** 🟡 **MEDIUM** - Fix nếu có vấn đề với date import

---

### BUG #8: TODO Comments Chưa Implement

**File:** `frontend/src/components/suppliers/SupplierList.tsx`  
**Line:** 1138-1140

**Code hiện tại:**
```typescript
if (print) {
    // TODO: Implement print logic
    console.log('Print receipt');
}
```

**Vấn đề:**
- Feature chưa hoàn thiện
- Button "In phiếu" không hoạt động
- Chỉ log ra console

**Tác động:**
- 🟡 User click button nhưng không có gì xảy ra
- 🟡 UX không tốt

**Cách fix:**

**Option 1:** Implement print logic (giống PaymentModal)
```typescript
if (print) {
    printReceipt(paymentData);
}

const printReceipt = (payment: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Phiếu chi ${payment.code}</title>
            <style>
                /* CSS styles */
            </style>
        </head>
        <body>
            <!-- Receipt content -->
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
};
```

**Option 2:** Remove button nếu chưa cần
```typescript
// Xóa button "In phiếu" hoặc disable nó
<button disabled>In phiếu (Đang phát triển)</button>
```

**Độ ưu tiên:** 🟡 **MEDIUM** - Implement hoặc remove button

---

### BUG #9: Không Handle Popup Blocked

**File:** `frontend/src/components/customers/PaymentModal.tsx`  
**Line:** 230-235

**Code hiện tại:**
```typescript
const printReceipt = (payment: any) => {
    // ... prepare data
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
        return; // ❌ Không có fallback
    }

    printWindow.document.write(/* HTML */);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
};
```

**Vấn đề:**
- Nếu browser block popup, user không thể in
- Không có fallback option
- UX không tốt

**Tác động:**
- 🟡 User không thể in receipt
- 🟡 Phải manually allow popup rồi thử lại

**Cách fix:**

**Option 1:** Thêm fallback download PDF
```typescript
const printReceipt = (payment: any) => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        // Fallback: Download as PDF or show in modal
        const shouldDownload = window.confirm(
            'Trình duyệt đã chặn popup. Bạn có muốn tải xuống file PDF không?'
        );
        
        if (shouldDownload) {
            downloadReceiptAsPDF(payment);
        }
        return;
    }

    // ... rest of print logic
};

const downloadReceiptAsPDF = (payment: any) => {
    // Use library like jsPDF or html2pdf
    // Or send to backend to generate PDF
};
```

**Option 2:** Show receipt in modal
```typescript
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [receiptData, setReceiptData] = useState(null);

const printReceipt = (payment: any) => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        // Show in modal instead
        setReceiptData(payment);
        setShowReceiptModal(true);
        return;
    }

    // ... rest of print logic
};

// JSX
{showReceiptModal && (
    <ReceiptModal 
        data={receiptData} 
        onClose={() => setShowReceiptModal(false)}
        onPrint={() => {/* Try print again */}}
    />
)}
```

**Độ ưu tiên:** 🟡 **MEDIUM** - Cải thiện UX

---

## 🟢 LOW PRIORITY BUGS

### BUG #10: Potential Null/Undefined Access

**Files:** Multiple files

**Vấn đề:**
- Nhiều chỗ gọi `.map()`, `.filter()`, `.find()` mà không check null/undefined trước
- Có thể crash nếu API trả về null

**Ví dụ:**
```typescript
// CustomerDetail.tsx
invoices.map(inv => ...) // ❌ Nếu invoices = null?

// PaymentModal.tsx
outstandingInvoices.map(inv => ...) // ❌ Nếu undefined?

// InvoiceList.tsx
data.map((inv: any) => ...) // ❌ Nếu data = null?
```

**Tác động:**
- 🟢 Hiếm khi xảy ra (API thường trả về array rỗng)
- 🟢 Nhưng nếu xảy ra thì crash app

**Cách fix:**

**Option 1:** Optional chaining + default value
```typescript
(invoices || []).map(inv => ...)
(data?.data || []).map(inv => ...)
```

**Option 2:** Early return
```typescript
if (!invoices || !Array.isArray(invoices)) {
    return <div>Không có dữ liệu</div>;
}

return invoices.map(inv => ...);
```

**Option 3:** TypeScript strict mode
```typescript
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "strictNullChecks": true
    }
}
```

**Độ ưu tiên:** 🟢 **LOW** - Fix khi có thời gian

---

## 🎯 KHUYẾN NGHỊ FIX

### Ưu tiên 1 (Fix ngay - trước khi merge)
- ✅ BUG #1: Duplicate placeholder (syntax error)
- ✅ BUG #2: Memory leak trong PaymentModal

### Ưu tiên 2 (Fix trước khi deploy production)
- ⚠️ BUG #3: Xóa console.log
- ⚠️ BUG #4: Validate payment date
- ⚠️ BUG #5: Fix floating point comparison

### Ưu tiên 3 (Fix trong sprint tiếp theo)
- 🟡 BUG #6: Hardcoded collectors
- 🟡 BUG #7: Excel date bug
- 🟡 BUG #8: TODO implement print
- 🟡 BUG #9: Popup blocked fallback

### Ưu tiên 4 (Backlog)
- 🟢 BUG #10: Null safety

---

## 📝 SCRIPT TỰ ĐỘNG FIX

### Xóa console.log
```bash
# Tìm tất cả console.log
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs grep -l "console.log"

# Xóa console.log (cẩn thận!)
find frontend/src -name "*.tsx" -o -name "*.ts" -exec sed -i '/console\.log/d' {} \;
```

### Tìm duplicate code
```bash
# Tìm duplicate placeholder
grep -rn "placeholder.*placeholder" frontend/src/
```

---

## ✅ CHECKLIST TRƯỚC KHI DEPLOY

- [ ] Fix BUG #1: Duplicate placeholder
- [ ] Fix BUG #2: Memory leak
- [ ] Xóa tất cả console.log (BUG #3)
- [ ] Thêm payment date validation (BUG #4)
- [ ] Fix floating point comparison (BUG #5)
- [ ] Review và fix các TODO comments
- [ ] Test trên nhiều browsers
- [ ] Test với popup blocker enabled

---

**Report generated:** 18/04/2026  
**Scanned by:** Kiro AI - Chiến thần dò bug 🔍  
**Total bugs found:** 10  
**Critical bugs:** 2  
**Status:** ⚠️ Cần fix 5 bugs trước khi deploy production
