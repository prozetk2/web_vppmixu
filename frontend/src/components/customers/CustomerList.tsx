import { useState, useEffect, useRef } from 'react';
import { customersAPI } from '../../services/api';
import { readTabState, writeTabState } from '../../services/tabStateCache';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { MdPeople, MdHourglassEmpty, MdDownload, MdSearch, MdAdd, MdBarChart, MdKeyboardArrowRight, MdCalendarToday, MdChevronLeft, MdChevronRight, MdFileUpload } from 'react-icons/md';
import CustomerDetail from './CustomerDetail';
import './CustomerList.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;



interface Customer {
    id: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;

    // Thông tin bổ sung
    contactPerson?: string;
    position?: string;
    fax?: string;
    website?: string;

    // Địa chỉ chi tiết
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
    country?: string;
    postalCode?: string;

    // Thông tin ngân hàng
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;

    // Thông tin kinh doanh
    customerType?: string;
    industry?: string;
    companySize?: string;

    // Phân loại & Ghi chú
    customerGroup?: string;
    priority?: string;
    source?: string;
    notes?: string;

    // Thông tin tài chính
    creditLimit?: number;
    paymentTerms?: string;

    active?: boolean;

    // Thống kê (từ API)
    currentDebt?: number;        // Nợ hiện tại
    debtDays?: number;           // Số ngày nợ
    totalSales?: number;         // Tổng bán
    totalSalesAfterReturn?: number; // Tổng bán trừ trả hàng

    createdAt: string;           // Ngày tạo
}



interface FormData {
    code: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;

    // Thông tin bổ sung
    contactPerson: string;
    position: string;
    fax: string;
    website: string;

    // Địa chỉ chi tiết
    street: string;
    ward: string;
    district: string;
    city: string;
    country: string;
    postalCode: string;

    // Thông tin ngân hàng
    bankName: string;
    bankAccount: string;
    bankBranch: string;

    // Thông tin kinh doanh
    customerType: string;
    industry: string;
    companySize: string;

    // Phân loại & Ghi chú
    customerGroup: string;
    priority: string;
    source: string;
    notes: string;

    // Thông tin tài chính
    creditLimit: string;
    paymentTerms: string;

    // Thống kê tài chính (tùy chọn)
    currentDebt?: string;
    debtDays?: string;
    totalSales?: string;
    totalSalesAfterReturn?: string;
}

interface CustomerListProps {
    onOpenInvoice?: (invoiceId: string) => void;
}

interface CustomerListCacheState {
    filterGroup: string;
    dateCreatedRange: string;
    filterCreator: string;
    filterType: string;
    filterGender: string;
    birthDateRange: string;
    lastTxDateRange: string;
    salesRangeFrom: string;
    salesRangeTo: string;
    salesTimeRange: string;
    currentDebtFrom: string;
    currentDebtTo: string;
    debtDaysFrom: string;
    debtDaysTo: string;
    deliveryArea: string;
    customerStatus: string;
    sidebarCollapsed: boolean;
    searchQuery: string;
    debtFilter: 'all' | 'has-debt' | 'no-debt';
    debtDaysFilter: 'all' | '<30' | '>30' | '>60';
    sortBy: 'name' | 'debt' | 'date';
    currentPage: number;
    itemsPerPage: number;
}

const CUSTOMER_LIST_CACHE_KEY = 'customer-list';

const CUSTOMER_LIST_CACHE_DEFAULTS: CustomerListCacheState = {
    filterGroup: 'all',
    dateCreatedRange: 'all',
    filterCreator: '',
    filterType: 'all',
    filterGender: 'all',
    birthDateRange: 'all',
    lastTxDateRange: 'all',
    salesRangeFrom: '',
    salesRangeTo: '',
    salesTimeRange: 'all',
    currentDebtFrom: '',
    currentDebtTo: '',
    debtDaysFrom: '',
    debtDaysTo: '',
    deliveryArea: '',
    customerStatus: 'active',
    sidebarCollapsed: false,
    searchQuery: '',
    debtFilter: 'all',
    debtDaysFilter: 'all',
    sortBy: 'date',
    currentPage: 1,
    itemsPerPage: 100,
};

export default function CustomerList({ onOpenInvoice }: CustomerListProps) {
    const cachedStateRef = useRef<CustomerListCacheState>(
        readTabState(CUSTOMER_LIST_CACHE_KEY, CUSTOMER_LIST_CACHE_DEFAULTS)
    );
    // Helper function to create empty form data
    const createEmptyFormData = (): FormData => ({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
        contactPerson: '',
        position: '',
        fax: '',
        website: '',
        street: '',
        ward: '',
        district: '',
        city: '',
        country: 'Vietnam',
        postalCode: '',
        bankName: '',
        bankAccount: '',
        bankBranch: '',
        customerType: 'INDIVIDUAL',
        industry: '',
        companySize: '',
        customerGroup: '',
        priority: 'NORMAL',
        source: '',
        notes: '',
        creditLimit: '0',
        paymentTerms: '',
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(createEmptyFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Sidebar Filter States
    const [filterGroup, setFilterGroup] = useState(cachedStateRef.current.filterGroup);
    const [dateCreatedRange, setDateCreatedRange] = useState(cachedStateRef.current.dateCreatedRange);
    const [filterCreator, setFilterCreator] = useState(cachedStateRef.current.filterCreator);
    const [filterType, setFilterType] = useState(cachedStateRef.current.filterType);
    const [filterGender, setFilterGender] = useState(cachedStateRef.current.filterGender);
    const [birthDateRange, setBirthDateRange] = useState(cachedStateRef.current.birthDateRange);
    const [lastTxDateRange, setLastTxDateRange] = useState(cachedStateRef.current.lastTxDateRange);
    const [salesRangeFrom, setSalesRangeFrom] = useState(cachedStateRef.current.salesRangeFrom);
    const [salesRangeTo, setSalesRangeTo] = useState(cachedStateRef.current.salesRangeTo);
    const [salesTimeRange, setSalesTimeRange] = useState(cachedStateRef.current.salesTimeRange);
    const [currentDebtFrom, setCurrentDebtFrom] = useState(cachedStateRef.current.currentDebtFrom);
    const [currentDebtTo, setCurrentDebtTo] = useState(cachedStateRef.current.currentDebtTo);
    const [debtDaysFrom, setDebtDaysFrom] = useState(cachedStateRef.current.debtDaysFrom);
    const [debtDaysTo, setDebtDaysTo] = useState(cachedStateRef.current.debtDaysTo);
    const [deliveryArea, setDeliveryArea] = useState(cachedStateRef.current.deliveryArea);
    const [customerStatus, setCustomerStatus] = useState(cachedStateRef.current.customerStatus);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(cachedStateRef.current.sidebarCollapsed);
    const [importNote, setImportNote] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState(cachedStateRef.current.searchQuery);
    const [debtFilter, _setDebtFilter] = useState<'all' | 'has-debt' | 'no-debt'>(cachedStateRef.current.debtFilter);
    const [debtDaysFilter, _setDebtDaysFilter] = useState<'all' | '<30' | '>30' | '>60'>(cachedStateRef.current.debtDaysFilter);
    const [sortBy, setSortBy] = useState<'name' | 'debt' | 'date'>(cachedStateRef.current.sortBy);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(cachedStateRef.current.currentPage);
    const [itemsPerPage, setItemsPerPage] = useState(cachedStateRef.current.itemsPerPage);
    const hasInitializedPaginationResetRef = useRef(false);

    const toast = useToast();

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        writeTabState(CUSTOMER_LIST_CACHE_KEY, {
            filterGroup,
            dateCreatedRange,
            filterCreator,
            filterType,
            filterGender,
            birthDateRange,
            lastTxDateRange,
            salesRangeFrom,
            salesRangeTo,
            salesTimeRange,
            currentDebtFrom,
            currentDebtTo,
            debtDaysFrom,
            debtDaysTo,
            deliveryArea,
            customerStatus,
            sidebarCollapsed,
            searchQuery,
            debtFilter,
            debtDaysFilter,
            sortBy,
            currentPage,
            itemsPerPage,
        });
    }, [
        filterGroup,
        dateCreatedRange,
        filterCreator,
        filterType,
        filterGender,
        birthDateRange,
        lastTxDateRange,
        salesRangeFrom,
        salesRangeTo,
        salesTimeRange,
        currentDebtFrom,
        currentDebtTo,
        debtDaysFrom,
        debtDaysTo,
        deliveryArea,
        customerStatus,
        sidebarCollapsed,
        searchQuery,
        debtFilter,
        debtDaysFilter,
        sortBy,
        currentPage,
        itemsPerPage,
    ]);



    // Apply search, filter, and sort
    useEffect(() => {
        let result = [...customers];

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.code?.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            );
        }

        // Filter by customer type (Cá nhân / Công ty)
        if (filterType !== 'all') {
            if (filterType === 'Cá nhân') {
                // Individual: customerType is 'Cá nhân' OR undefined/null (default to individual)
                result = result.filter(c =>
                    !c.customerType ||
                    c.customerType === 'Cá nhân' ||
                    c.customerType.toLowerCase().includes('cá nhân')
                );
            } else if (filterType === 'Công ty') {
                // Company: customerType explicitly contains 'Công ty' or 'Doanh nghiệp'
                result = result.filter(c =>
                    c.customerType && (
                        c.customerType === 'Công ty' ||
                        c.customerType.toLowerCase().includes('công ty') ||
                        c.customerType.toLowerCase().includes('doanh nghiệp')
                    )
                );
            }
        }

        // Filter by gender (only for individual customers)
        if (filterGender !== 'all') {
            // Gender detection based on Vietnamese name patterns
            // This is a basic implementation - names starting with female prefixes
            if (filterGender === 'male') {
                result = result.filter(c => {
                    // Skip companies
                    if (c.customerType?.toLowerCase().includes('công ty')) return false;
                    // Check notes for gender info
                    if (c.notes?.toLowerCase().includes('nam')) return true;
                    // Basic name pattern: names not typically female
                    return !c.name?.match(/^(Nguyễn Thị|Trần Thị|Lê Thị|Phạm Thị|Võ Thị|Đặng Thị|Bùi Thị)/i);
                });
            } else if (filterGender === 'female') {
                result = result.filter(c => {
                    // Skip companies
                    if (c.customerType?.toLowerCase().includes('công ty')) return false;
                    // Check notes for gender info
                    if (c.notes?.toLowerCase().includes('nữ')) return true;
                    // Basic name pattern: common female name prefixes
                    return !!c.name?.match(/^(Nguyễn Thị|Trần Thị|Lê Thị|Phạm Thị|Võ Thị|Đặng Thị|Bùi Thị)/i);
                });
            }
        }

        // Filter by customer status
        if (customerStatus !== 'all') {
            if (customerStatus === 'active') {
                // Active: active is true or undefined (default to active)
                result = result.filter(c => c.active !== false);
            } else if (customerStatus === 'inactive') {
                // Inactive: active is explicitly false
                result = result.filter(c => c.active === false);
            }
        }

        // Filter by sales range (Tổng bán)
        if (salesRangeFrom) {
            const fromValue = parseFloat(salesRangeFrom);
            if (!isNaN(fromValue)) {
                result = result.filter(c => (c.totalSales || 0) >= fromValue);
            }
        }
        if (salesRangeTo) {
            const toValue = parseFloat(salesRangeTo);
            if (!isNaN(toValue)) {
                result = result.filter(c => (c.totalSales || 0) <= toValue);
            }
        }

        // Filter by current debt range (Nợ hiện tại)
        if (currentDebtFrom) {
            const fromValue = parseFloat(currentDebtFrom);
            if (!isNaN(fromValue)) {
                result = result.filter(c => getPositiveDebtValue(c.currentDebt) >= fromValue);
            }
        }
        if (currentDebtTo) {
            const toValue = parseFloat(currentDebtTo);
            if (!isNaN(toValue)) {
                result = result.filter(c => getPositiveDebtValue(c.currentDebt) <= toValue);
            }
        }

        // Filter by debt days range (Số ngày nợ)
        if (debtDaysFrom) {
            const fromValue = parseInt(debtDaysFrom);
            if (!isNaN(fromValue)) {
                result = result.filter(c => (c.debtDays || 0) >= fromValue);
            }
        }
        if (debtDaysTo) {
            const toValue = parseInt(debtDaysTo);
            if (!isNaN(toValue)) {
                result = result.filter(c => (c.debtDays || 0) <= toValue);
            }
        }

        // Legacy debt filter
        if (debtFilter === 'has-debt') {
            result = result.filter(c => getPositiveDebtValue(c.currentDebt) > 0);
        } else if (debtFilter === 'no-debt') {
            result = result.filter(c => getPositiveDebtValue(c.currentDebt) === 0);
        }

        // Legacy debt days filter
        if (debtDaysFilter === '<30') {
            result = result.filter(c => c.debtDays && c.debtDays > 0 && c.debtDays < 30);
        } else if (debtDaysFilter === '>30') {
            result = result.filter(c => c.debtDays && c.debtDays >= 30 && c.debtDays < 60);
        } else if (debtDaysFilter === '>60') {
            result = result.filter(c => c.debtDays && c.debtDays >= 60);
        }

        // Sort
        if (sortBy === 'name') {
            result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortBy === 'debt') {
            result.sort((a, b) => getPositiveDebtValue(b.currentDebt) - getPositiveDebtValue(a.currentDebt));
        } else if (sortBy === 'date') {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        setFilteredCustomers(result);
    }, [customers, searchQuery, filterType, filterGender, customerStatus, salesRangeFrom, salesRangeTo, currentDebtFrom, currentDebtTo, debtDaysFrom, debtDaysTo, debtFilter, debtDaysFilter, sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (!hasInitializedPaginationResetRef.current) {
            hasInitializedPaginationResetRef.current = true;
            return;
        }
        setCurrentPage(1);
    }, [searchQuery, filterType, filterGender, customerStatus, salesRangeFrom, salesRangeTo, currentDebtFrom, currentDebtTo, debtDaysFrom, debtDaysTo, debtFilter, debtDaysFilter, itemsPerPage]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await customersAPI.getAll();
            setCustomers((response.data?.data || response.data || []).map((c: any) => ({
                ...c,
                id: c.id.toString(),
            })));
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Không thể tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData(createEmptyFormData());
        setErrors({});
        setIsFormOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            code: customer.code || '',
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            taxNumber: customer.taxNumber || '',
            contactPerson: customer.contactPerson || '',
            position: customer.position || '',
            fax: customer.fax || '',
            website: customer.website || '',
            street: customer.street || '',
            ward: customer.ward || '',
            district: customer.district || '',
            city: customer.city || '',
            country: customer.country || 'Vietnam',
            postalCode: customer.postalCode || '',
            bankName: customer.bankName || '',
            bankAccount: customer.bankAccount || '',
            bankBranch: customer.bankBranch || '',
            customerType: customer.customerType || 'INDIVIDUAL',
            industry: customer.industry || '',
            companySize: customer.companySize || '',
            customerGroup: customer.customerGroup || '',
            priority: customer.priority || 'NORMAL',
            source: customer.source || '',
            notes: customer.notes || '',
            creditLimit: customer.creditLimit?.toString() || '0',
            paymentTerms: customer.paymentTerms || '',
            // Thống kê tài chính
            currentDebt: customer.currentDebt?.toString() || '',
            debtDays: customer.debtDays?.toString() || '',
            totalSales: customer.totalSales?.toString() || '',
            totalSalesAfterReturn: customer.totalSalesAfterReturn?.toString() || '',
        });
        setErrors({});
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingCustomer(null);
    };

    const openDetail = (customer: Customer) => {
        if (expandedCustomerId === customer.id) {
            setExpandedCustomerId(null);
        } else {
            setExpandedCustomerId(customer.id);
        }
    };



    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Tên khách hàng là bắt buộc';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            if (editingCustomer) {
                await customersAPI.update(editingCustomer.id, formData);
                toast.success('Cập nhật khách hàng thành công');
            } else {
                await customersAPI.create(formData);
                toast.success('Thêm khách hàng thành công');
            }
            closeFormModal();
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (customer: Customer) => {
        if (!confirm(`Xóa khách hàng "${customer.name}"?`)) return;
        try {
            await customersAPI.delete(customer.id);
            toast.success('Xóa khách hàng thành công');
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa khách hàng');
        }
    };

    const formatCurrency = (value: any): string => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return '0';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const getPositiveDebtValue = (value?: number | string | null): number => {
        const num = typeof value === 'number' ? value : parseFloat(value || '0');
        return isNaN(num) ? 0 : Math.abs(num);
    };

    // === IMPORT FUNCTIONALITY ===
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportNote('');

        try {
            let parsedCustomers: Partial<FormData>[] = [];

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                parsedCustomers = await parseExcel(file);
            } else if (file.name.endsWith('.pdf')) {
                parsedCustomers = await parsePDF(file);
            } else if (file.name.endsWith('.csv')) {
                parsedCustomers = await parseCSV(file);
            } else {
                throw new Error('Định dạng file không được hỗ trợ');
            }

            if (!parsedCustomers || parsedCustomers.length === 0) {
                setImportNote('❌ Không tìm thấy dữ liệu khách hàng trong file');
                return;
            }

            console.log('Total parsed customers:', parsedCustomers.length);
            console.log('First customer sample:', parsedCustomers[0]);

            // Lấy danh sách khách hàng hiện có để check trùng lặp (Upsert)
            let existingCustomers: any[] = [];
            try {
                const res = await customersAPI.getAll();
                existingCustomers = res.data?.data || res.data || [];
            } catch (err) {
                console.error('Lỗi khi lấy danh sách khách hàng để check trùng', err);
            }

            const codeMap = new Map();
            const phoneMap = new Map();
            existingCustomers.forEach(c => {
                if (c.code) codeMap.set(c.code.toLowerCase(), c);
                if (c.phone) phoneMap.set(c.phone.replace(/\D/g, ''), c);
            });

            // Lọc các khách hàng trùng lặp trong chính file excel (ưu tiên dòng ở dưới - dòng mới nhất)
            const uniqueParsed = [];
            const seenCode = new Set();
            const seenPhone = new Set();

            for (let i = parsedCustomers.length - 1; i >= 0; i--) {
                const c = parsedCustomers[i];
                if (!c.name) continue;

                let isDuplicate = false;
                if (c.code) {
                    const cleanCode = c.code.toString().toLowerCase();
                    if (seenCode.has(cleanCode)) isDuplicate = true;
                    seenCode.add(cleanCode);
                }
                if (c.phone && !isDuplicate) {
                    const cleanPhone = c.phone.toString().replace(/\D/g, '');
                    if (seenPhone.has(cleanPhone)) isDuplicate = true;
                    seenPhone.add(cleanPhone);
                }

                if (!isDuplicate) {
                    uniqueParsed.unshift(c);
                }
            }

            // Bulk create/update customers
            let createdCount = 0;
            let updatedCount = 0;
            let failCount = 0;
            const errors: string[] = [];

            for (const customer of uniqueParsed) {
                let existing = null;
                if (customer.code) {
                    existing = codeMap.get(customer.code.toString().toLowerCase());
                }
                if (!existing && customer.phone) {
                    existing = phoneMap.get(customer.phone.toString().replace(/\D/g, ''));
                }

                try {
                    if (existing) {
                        console.log('Updating customer:', existing.code || existing.name);
                        await customersAPI.update(existing.id, customer as any);
                        updatedCount++;
                    } else {
                        console.log('Creating customer:', customer.code || customer.name);
                        await customersAPI.create(customer as any);
                        createdCount++;
                    }
                } catch (error: any) {
                    failCount++;
                    const errorMsg = error.response?.data?.message || error.message;
                    if (errors.length < 5) {
                        errors.push(`${customer.name}: ${errorMsg}`);
                    }
                }
            }

            if (errors.length > 0) {
                console.log('First 5 errors:', errors);
            }

            const totalSuccess = createdCount + updatedCount;
            setImportNote(`✅ Import thành công ${totalSuccess} khách hàng (${createdCount} tạo mới, ${updatedCount} cập nhật)${failCount > 0 ? `, thất bại ${failCount} lỗi` : ''}`);
            toast.success(`Import hoàn tất: ${createdCount} mới, ${updatedCount} cập nhật!`);
            fetchCustomers();
        } catch (error: any) {
            setImportNote(`❌ Lỗi: ${error.message}`);
            toast.error(error.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const parseExcel = async (file: File): Promise<Partial<FormData>[]> => {
        // Helper function to convert Excel serial date to JS Date
        const excelDateToJSDate = (serial: any): string | undefined => {
            if (!serial) return undefined;

            // If it's already a valid date string, return it
            if (typeof serial === 'string' && serial.includes('/')) {
                return serial;
            }

            // If it's an Excel serial number
            const num = typeof serial === 'number' ? serial : parseFloat(serial);
            if (isNaN(num)) return undefined;

            // Excel epoch starts at 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const days = num - 2; // Excel has a bug with leap year 1900, so subtract 2
            const jsDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

            // Return ISO string
            return jsDate.toISOString().split('T')[0];
        };

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

                    // Find header row (look for 'tên' or 'name')
                    let headerIdx = 0;
                    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                        const row = jsonData[i]?.map((c) => String(c || '').toLowerCase()) || [];
                        if (row.some((c) => c.includes('tên') || c.includes('name') || c.includes('khách'))) {
                            headerIdx = i;
                            break;
                        }
                    }

                    const headers = jsonData[headerIdx]?.map((h) => String(h || '').toLowerCase()) || [];
                    const customers: Partial<FormData>[] = [];

                    for (let i = headerIdx + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every((c) => !c)) continue;

                        const customer: any = {};

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
                                customer.birthDate = excelDateToJSDate(val);
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
                                customer.lastTransaction = excelDateToJSDate(val);
                            }
                            else if (h.includes('số ngày nợ')) {
                                // Parse số
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) customer.debtDays = num;
                            }
                            else if (h.includes('nợ cần thu') || h.includes('nợ hiện tại')) {
                                // Parse số tiền
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) customer.currentDebt = num;
                            }
                            else if (h.includes('tổng bán') && !h.includes('trừ')) {
                                // Parse số tiền
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) customer.totalSales = num;
                            }
                            else if (h.includes('tổng bán trừ')) {
                                // Parse số tiền
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) customer.totalSalesAfterReturn = num;
                            }
                            else if (h.includes('trạng thái')) {
                                customer.status = strVal;
                            }
                        });

                        if (customer.name) customers.push(customer);
                    }

                    resolve(customers);
                } catch (err) {
                    reject(new Error('Không thể đọc file Excel'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsArrayBuffer(file);
        });
    };

    const parseCSV = async (file: File): Promise<Partial<FormData>[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter((l) => l.trim());
                    if (lines.length < 2) {
                        resolve([]);
                        return;
                    }

                    const headers = lines[0].split(',').map((h) => h.toLowerCase().trim());
                    const customers: Partial<FormData>[] = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',');
                        const customer: Partial<FormData> = {};

                        headers.forEach((h, idx) => {
                            const val = (values[idx] || '').trim().replace(/^"|"$/g, '');
                            if (h.includes('mã') || h.includes('code')) customer.code = val;
                            else if (h.includes('tên') || h.includes('name')) customer.name = val;
                            else if (h.includes('email')) customer.email = val;
                            else if (h.includes('phone') || h.includes('đt')) customer.phone = val;
                            else if (h.includes('địa') || h.includes('address')) customer.address = val;
                            else if (h.includes('mst') || h.includes('thuế')) customer.taxNumber = val;
                        });

                        if (customer.name) customers.push(customer);
                    }

                    resolve(customers);
                } catch {
                    reject(new Error('Không thể đọc file CSV'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsText(file);
        });
    };

    const parsePDF = async (file: File): Promise<Partial<FormData>[]> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
            }

            // Parse text - look for patterns
            const customers: Partial<FormData>[] = [];
            const lines = fullText.split('\n').filter((l) => l.trim());

            for (const line of lines) {
                // Try to extract customer info from each line
                const phoneMatch = line.match(/(0[0-9]{9,10})/g);
                const emailMatch = line.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi);

                // If line has phone or email, it might be a customer
                if (phoneMatch || emailMatch) {
                    customers.push({
                        name: line.replace(phoneMatch?.[0] || '', '').replace(emailMatch?.[0] || '', '').trim().slice(0, 100),
                        phone: phoneMatch?.[0] || '',
                        email: emailMatch?.[0] || '',
                    });
                }
            }

            return customers;
        } catch {
            throw new Error('Không thể đọc file PDF');
        }
    };

    // === EXPORT FUNCTIONALITY ===
    const handleExportCustomers = () => {
        if (filteredCustomers.length === 0) {
            toast.error('Không có khách hàng nào để xuất');
            return;
        }

        try {
            // Chuẩn bị dữ liệu
            const exportData = filteredCustomers.map((c, index) => ({
                'STT': index + 1,
                'Loại khách': c.customerType || 'Cá nhân',
                'Chi nhánh tạo': 'Mixu', // Default branch
                'Mã khách hàng': c.code || '',
                'Tên khách': c.name || '',
                'Điện thoại': c.phone || '',
                'Địa chỉ': c.address || '',
                'Khu vực': c.district || '',
                'Phường/Xã': c.ward || '',
                'Công ty': c.contactPerson || '', // Company contact
                'Mã số thuế': c.taxNumber || '',
                'Số CMT': '', // ID number - not in current interface
                'Ngày sinh': '', // Birth date - not in current interface
                'Giới tính': '', // Gender - not in current interface
                'Email': c.email || '',
                'Facebook': c.website || '', // Using website field for social
                'Nhóm': c.customerGroup || '',
                'Ghi chú': c.notes || '',
                'Người tạo': '', // Creator - not tracked
                'Ngày tạo': c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '',
                'Ngày giao dịch cuối': '', // Last transaction date
                'Số ngày nợ': c.debtDays || 0,
                'Nợ cần thu': getPositiveDebtValue(c.currentDebt),
                'Tổng bán': c.totalSales || 0,
                'Tổng bán trừ TH': c.totalSalesAfterReturn || 0,
                'Trạng thái': c.active !== false ? 'Đang giao dịch' : 'Ngừng giao dịch',
            }));

            // Tạo workbook
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Đặt độ rộng cột
            worksheet['!cols'] = [
                { wch: 5 },   // STT
                { wch: 12 },  // Loại khách
                { wch: 15 },  // Chi nhánh tạo
                { wch: 15 },  // Mã khách hàng
                { wch: 30 },  // Tên khách
                { wch: 15 },  // Điện thoại
                { wch: 40 },  // Địa chỉ
                { wch: 15 },  // Khu vực
                { wch: 15 },  // Phường/Xã
                { wch: 25 },  // Công ty
                { wch: 15 },  // Mã số thuế
                { wch: 15 },  // Số CMT
                { wch: 12 },  // Ngày sinh
                { wch: 10 },  // Giới tính
                { wch: 25 },  // Email
                { wch: 20 },  // Facebook
                { wch: 15 },  // Nhóm
                { wch: 30 },  // Ghi chú
                { wch: 15 },  // Người tạo
                { wch: 12 },  // Ngày tạo
                { wch: 18 },  // Ngày giao dịch cuối
                { wch: 12 },  // Số ngày nợ (V - index 21)
                { wch: 18 },  // Nợ cần thu (W - index 22)
                { wch: 18 },  // Tổng bán (X - index 23)
                { wch: 18 },  // Tổng bán trừ TH (Y - index 24)
                { wch: 15 },  // Trạng thái
            ];

            // Áp dụng định dạng số với dấu phân cách hàng nghìn cho các cột tiền
            // Các cột cần format: V (Số ngày nợ), W (Nợ cần thu), X (Tổng bán), Y (Tổng bán trừ TH)
            const numericColumns = ['V', 'W', 'X', 'Y']; // Số ngày nợ, Nợ cần thu, Tổng bán, Tổng bán trừ TH
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

            for (let R = range.s.r + 1; R <= range.e.r; R++) { // Bỏ qua header row
                numericColumns.forEach(col => {
                    const cellAddress = col + (R + 1);
                    const cell = worksheet[cellAddress];
                    if (cell && typeof cell.v === 'number') {
                        cell.z = '#,##0'; // Format số với dấu phân cách hàng nghìn
                    }
                });
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách khách hàng');

            // Xuất file
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            XLSX.writeFile(workbook, `DanhSachKhachHang_${date}.xlsx`);
            toast.success(`Xuất thành công ${filteredCustomers.length} khách hàng`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Lỗi khi xuất file');
        }
    };

    return (
        <div className="customer-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="customer-header">
                <h2><MdPeople /> Quản lý khách hàng</h2>
                <div className="header-actions">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".xlsx,.xls,.csv,.pdf"
                        style={{ display: 'none' }}
                    />
                    <button onClick={handleImportClick} className="btn-import" disabled={importing}>
                        {importing ? <><MdHourglassEmpty /> Đang import...</> : <><MdDownload /> Import</>}
                    </button>
                    <button onClick={handleExportCustomers} className="btn-export">
                        <MdFileUpload /> Xuất file
                    </button>
                    <button onClick={openAddModal} className="btn-add">
                        <MdAdd /> Thêm KH
                    </button>
                </div>
            </div>

            {importNote && (
                <div className={`import-note ${importNote.startsWith('✅') ? 'success' : 'error'}`}>
                    {importNote}
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="customer-layout">
                {/* Sidebar Filters */}
                <div className={`customer-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    >
                        {sidebarCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
                    </button>

                    <div className="filter-group">
                        <label className="filter-label">Nhóm khách hàng <a href="#" className="create-link">Tạo mới</a></label>
                        <select
                            className="filter-select-sidebar"
                            value={filterGroup}
                            onChange={(e) => setFilterGroup(e.target.value)}
                        >
                            <option value="all">Tất cả các nhóm</option>
                            <option value="vip">VIP</option>
                            <option value="le">Khách lẻ</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Ngày tạo</label>
                        <div className="radio-group-vertical">
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateCreated"
                                    checked={dateCreatedRange === 'all'}
                                    onChange={() => setDateCreatedRange('all')}
                                />
                                <span>Toàn thời gian</span>
                                <MdKeyboardArrowRight className="arrow-icon" />
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateCreated"
                                    checked={dateCreatedRange === 'custom'}
                                    onChange={() => setDateCreatedRange('custom')}
                                />
                                <span>Tùy chỉnh</span>
                                <MdCalendarToday className="calendar-icon" />
                            </label>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Người tạo</label>
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder="Chọn người tạo"
                                className="filter-input"
                                value={filterCreator}
                                onChange={(e) => setFilterCreator(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Loại khách hàng</label>
                        <div className="pill-group">
                            <button
                                className={`pill-btn ${filterType === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterType('all')}
                            >
                                Tất cả
                            </button>
                            <button
                                className={`pill-btn ${filterType === 'personal' ? 'active' : ''}`}
                                onClick={() => setFilterType('personal')}
                            >
                                Cá nhân
                            </button>
                            <button
                                className={`pill-btn ${filterType === 'company' ? 'active' : ''}`}
                                onClick={() => setFilterType('company')}
                            >
                                Công ty
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Giới tính</label>
                        <div className="pill-group">
                            <button
                                className={`pill-btn ${filterGender === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterGender('all')}
                            >
                                Tất cả
                            </button>
                            <button
                                className={`pill-btn ${filterGender === 'male' ? 'active' : ''}`}
                                onClick={() => setFilterGender('male')}
                            >
                                Nam
                            </button>
                            <button
                                className={`pill-btn ${filterGender === 'female' ? 'active' : ''}`}
                                onClick={() => setFilterGender('female')}
                            >
                                Nữ
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Sinh nhật</label>
                        <div className="radio-group-vertical">
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="birthDate"
                                    checked={birthDateRange === 'all'}
                                    onChange={() => setBirthDateRange('all')}
                                />
                                <span>Toàn thời gian</span>
                                <MdKeyboardArrowRight className="arrow-icon" />
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="birthDate"
                                    checked={birthDateRange === 'custom'}
                                    onChange={() => setBirthDateRange('custom')}
                                />
                                <span>Tùy chỉnh</span>
                                <MdCalendarToday className="calendar-icon" />
                            </label>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Ngày giao dịch cuối</label>
                        <div className="radio-group-vertical">
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="lastTxDate"
                                    checked={lastTxDateRange === 'all'}
                                    onChange={() => setLastTxDateRange('all')}
                                />
                                <span>Toàn thời gian</span>
                                <MdKeyboardArrowRight className="arrow-icon" />
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="lastTxDate"
                                    checked={lastTxDateRange === 'custom'}
                                    onChange={() => setLastTxDateRange('custom')}
                                />
                                <span>Tùy chỉnh</span>
                                <MdCalendarToday className="calendar-icon" />
                            </label>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Tổng bán</label>

                        {/* Giá trị section */}
                        <div className="sub-filter-group">
                            <label className="sub-label">Giá trị</label>
                            <div className="range-inputs-vertical">
                                <div className="input-group-prefix">
                                    <span className="input-prefix">Từ</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={salesRangeFrom}
                                        onChange={(e) => setSalesRangeFrom(e.target.value)}
                                        className="prefix-input"
                                    />
                                </div>
                                <div className="input-group-prefix">
                                    <span className="input-prefix">Tới</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={salesRangeTo}
                                        onChange={(e) => setSalesRangeTo(e.target.value)}
                                        className="prefix-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Thời gian section */}
                        <div className="sub-filter-group">
                            <label className="sub-label">Thời gian</label>
                            <div className="radio-group-vertical">
                                <label className="radio-item">
                                    <input
                                        type="radio"
                                        name="salesTime"
                                        checked={salesTimeRange === 'all'}
                                        onChange={() => setSalesTimeRange('all')}
                                    />
                                    <span>Toàn thời gian</span>
                                    <MdKeyboardArrowRight className="arrow-icon" />
                                </label>
                                <label className="radio-item">
                                    <input
                                        type="radio"
                                        name="salesTime"
                                        checked={salesTimeRange === 'custom'}
                                        onChange={() => setSalesTimeRange('custom')}
                                    />
                                    <span>Tùy chỉnh</span>
                                    <MdCalendarToday className="calendar-icon" />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Nợ hiện tại</label>
                        <div className="range-inputs-row">
                            <div className="range-input-compact">
                                <span className="range-prefix">Từ</span>
                                <input
                                    type="text"
                                    placeholder="Giá trị"
                                    value={currentDebtFrom}
                                    onChange={(e) => setCurrentDebtFrom(e.target.value)}
                                />
                            </div>
                            <div className="range-input-compact">
                                <span className="range-prefix">Tới</span>
                                <input
                                    type="text"
                                    placeholder="Giá trị"
                                    value={currentDebtTo}
                                    onChange={(e) => setCurrentDebtTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Số ngày nợ</label>
                        <div className="range-inputs-row">
                            <div className="range-input-compact">
                                <span className="range-prefix">Từ</span>
                                <input
                                    type="text"
                                    placeholder="Giá trị"
                                    value={debtDaysFrom}
                                    onChange={(e) => setDebtDaysFrom(e.target.value)}
                                />
                            </div>
                            <div className="range-input-compact">
                                <span className="range-prefix">Tới</span>
                                <input
                                    type="text"
                                    placeholder="Giá trị"
                                    value={debtDaysTo}
                                    onChange={(e) => setDebtDaysTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Khu vực giao hàng</label>
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder="Chọn Tỉnh/TP - Quận/Huyện"
                                className="filter-input"
                                value={deliveryArea}
                                onChange={(e) => setDeliveryArea(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Trạng thái</label>
                        <div className="status-pill-group">
                            <button
                                className={`status-pill ${customerStatus === 'all' ? 'active' : ''}`}
                                onClick={() => setCustomerStatus('all')}
                            >
                                Tất cả
                            </button>
                            <button
                                className={`status-pill ${customerStatus === 'active' ? 'active' : ''}`}
                                onClick={() => setCustomerStatus('active')}
                            >
                                Đang hoạt động
                            </button>
                            <button
                                className={`status-pill ${customerStatus === 'inactive' ? 'active' : ''}`}
                                onClick={() => setCustomerStatus('inactive')}
                            >
                                Ngừng hoạt động
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="customer-main-content">
                    {/* Search & Filter Bar */}
                    <div className="search-filter-bar">
                        <div className="search-box">
                            <MdSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, mã KH, hoặc số điện thoại..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button
                                    className="clear-search"
                                    onClick={() => setSearchQuery('')}
                                    title="Xóa tìm kiếm"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="filter-controls">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="filter-select"
                            >
                                <option value="date">Mới nhất</option>
                                <option value="name">Theo tên</option>
                                <option value="debt">Nợ cao nhất</option>
                            </select>

                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="filter-select"
                            >
                                <option value="10">10 / trang</option>
                                <option value="20">20 / trang</option>
                                <option value="50">50 / trang</option>
                                <option value="100">100 / trang</option>
                            </select>
                        </div>

                        <div className="result-count">
                            <span>{filteredCustomers.length}</span> / {customers.length} khách hàng
                        </div>
                    </div>

                    <div className="customer-table-wrapper">
                        {loading ? (
                            <div className="customer-loading">Đang tải...</div>
                        ) : customers.length === 0 ? (
                            <div className="customer-empty">
                                <div className="customer-empty-icon"><MdPeople size={64} /></div>
                                <p>Chưa có khách hàng</p>
                            </div>
                        ) : (
                            <table className="customer-table">
                                <thead>
                                    <tr>
                                        <th>Mã KH</th>
                                        <th>Tên khách hàng</th>
                                        <th>Điện thoại</th>
                                        <th className="text-right">Nợ hiện tại</th>
                                        <th className="text-center">Số ngày nợ</th>
                                        <th className="text-right">Tổng bán</th>
                                        <th className="text-right">Tổng bán trừ TH</th>
                                        <th className="text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCustomers.map((c) => (
                                        <>
                                            <tr
                                                key={c.id}
                                                className={expandedCustomerId === c.id ? 'selected-row' : ''}
                                                onClick={() => openDetail(c)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="customer-code">{c.code || '—'}</td>
                                                <td>
                                                    <span className="customer-name">
                                                        {c.name}
                                                    </span>
                                                </td>
                                                <td className="customer-contact">{c.phone || '—'}</td>
                                                <td className="text-right">
                                                    <span className={getPositiveDebtValue(c.currentDebt) > 0 ? 'debt-amount' : ''}>
                                                        {formatCurrency(getPositiveDebtValue(c.currentDebt))}đ
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {c.debtDays && c.debtDays > 0 ? (
                                                        <span className={c.debtDays > 30 ? 'debt-days-warning' : 'debt-days'}>
                                                            {c.debtDays} ngày
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="text-right">
                                                    {c.totalSales ? formatCurrency(c.totalSales) : '0'}đ
                                                </td>
                                                <td className="text-right">
                                                    {c.totalSalesAfterReturn ? formatCurrency(c.totalSalesAfterReturn) : '0'}đ
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(c); }} className="btn-edit">
                                                            Sửa
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="btn-delete">
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedCustomerId === c.id && (
                                                <tr className="expanded-row">
                                                    <td colSpan={8} className="detail-cell">
                                                        <div className="detail-container">
                                                            <CustomerDetail
                                                                customerId={c.id}
                                                                onEdit={() => {
                                                                    openEditModal(c);
                                                                }}
                                                                onDelete={() => {
                                                                    handleDelete(c);
                                                                }}
                                                                onRefresh={fetchCustomers}
                                                                onOpenInvoice={onOpenInvoice}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {!loading && filteredCustomers.length > 0 && (
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} của {filteredCustomers.length} khách hàng
                            </div>

                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                >
                                    ««
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    ‹
                                </button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    ›
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                >
                                    »»
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={closeFormModal}
                title={editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="customer-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Mã KH</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="form-input"
                                placeholder="VD: KH001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Tên khách hàng <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Tên đầy đủ"
                                autoFocus
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Điện thoại</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="form-input"
                                placeholder="0xxx xxx xxx"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="form-input"
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Địa chỉ</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="form-input"
                            placeholder="Địa chỉ đầy đủ"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mã số thuế</label>
                        <input
                            type="text"
                            value={formData.taxNumber}
                            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                            className="form-input"
                            placeholder="MST (nếu có)"
                        />
                    </div>

                    {/* Thống kê tài chính (tùy chọn) */}
                    <div className="form-section">
                        <h4 className="form-section-title"><MdBarChart /> Thống kê tài chính (tùy chọn)</h4>
                        <p className="form-section-note">Các trường này sẽ tự động tính từ đơn hàng. Chỉ nhập nếu muốn thiết lập giá trị ban đầu.</p>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nợ hiện tại (đ)</label>
                                <input
                                    type="number"
                                    value={formData.currentDebt || ''}
                                    onChange={(e) => setFormData({ ...formData, currentDebt: e.target.value })}
                                    className="form-input"
                                    placeholder="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số ngày nợ</label>
                                <input
                                    type="number"
                                    value={formData.debtDays || ''}
                                    onChange={(e) => setFormData({ ...formData, debtDays: e.target.value })}
                                    className="form-input"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Tổng bán (đ)</label>
                                <input
                                    type="number"
                                    value={formData.totalSales || ''}
                                    onChange={(e) => setFormData({ ...formData, totalSales: e.target.value })}
                                    className="form-input"
                                    placeholder="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tổng bán trừ TH (đ)</label>
                                <input
                                    type="number"
                                    value={formData.totalSalesAfterReturn || ''}
                                    onChange={(e) => setFormData({ ...formData, totalSalesAfterReturn: e.target.value })}
                                    className="form-input"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={closeFormModal} className="btn btn-secondary">
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Đang xử lý...' : editingCustomer ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            {/* Detail Modal Removed - now inline */}
        </div>
    );
}
