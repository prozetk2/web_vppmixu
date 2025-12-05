# Excel Template Example

## Tạo file data.xlsx với cấu trúc sau:

### Sheet 1: roles
```
code    | name          | description
--------|---------------|---------------------------
ADMIN   | Administrator | Quản trị viên hệ thống
MANAGER | Manager       | Quản lý cửa hàng
STAFF   | Staff         | Nhân viên bán hàng
CASHIER | Cashier       | Thu ngân
```

### Sheet 2: users
```
username | email              | password  | full_name      | phone       | enabled
---------|-------------------|-----------|----------------|-------------|--------
admin    | admin@store.com   | admin123  | Administrator  | 0901234567  | TRUE
manager1 | manager1@store.com| pass123   | Nguyen Van A   | 0901234568  | TRUE
staff1   | staff1@store.com  | pass123   | Tran Thi B     | 0901234569  | TRUE
```

### Sheet 3: user_roles (hoặc UserRoles)
```
username | role_code
---------|----------
admin    | ADMIN
manager1 | MANAGER
staff1   | STAFF
```

### Sheet 4: stores (hoặc Stores)
```
code   | name           | address                    | tax_number  | phone       | email
-------|----------------|----------------------------|-------------|-------------|------------------
ST001  | Store HCM      | 123 Nguyen Hue, HCM        | 0123456789  | 0281234567  | hcm@store.com
ST002  | Store HN       | 456 Ba Trieu, Hanoi        | 0987654321  | 0241234567  | hn@store.com
```

### Sheet 5: categories (hoặc Categories)
```
code    | name              | description            | parent_code
--------|-------------------|------------------------|-------------
CAT001  | Electronics       | Thiết bị điện tử       | 
CAT002  | Phones            | Điện thoại             | CAT001
CAT003  | Laptops           | Máy tính xách tay      | CAT001
CAT004  | Fashion           | Thời trang             |
CAT005  | Men Fashion       | Thời trang nam         | CAT004
CAT006  | Women Fashion     | Thời trang nữ          | CAT004
```

### Sheet 6: customers (hoặc Customers)
```
code    | name              | email                | phone       | address                | tax_number
--------|-------------------|----------------------|-------------|------------------------|------------
CUS001  | Nguyen Van C      | nvc@email.com        | 0901111111  | 789 Le Loi, HCM        |
CUS002  | Tran Thi D        | ttd@email.com        | 0902222222  | 321 Hai Ba Trung, HN   |
CUS003  | Company ABC       | abc@company.com      | 0903333333  | 555 Nguyen Trai, HCM   | 0123456789
```

### Sheet 7: suppliers (hoặc Suppliers)
```
code    | name              | email                | phone       | address                | tax_number
--------|-------------------|----------------------|-------------|------------------------|------------
SUP001  | Supplier A        | supa@email.com       | 0904444444  | 111 Street A, HCM      | 1111111111
SUP002  | Supplier B        | supb@email.com       | 0905555555  | 222 Street B, HN       | 2222222222
```

### Sheet 8: warehouses (hoặc Warehouses)
```
code   | name              | address                    | store_code
-------|-------------------|----------------------------|------------
WH001  | Warehouse HCM     | 999 Xa Lo Hanoi, HCM       | ST001
WH002  | Warehouse HN      | 888 Giai Phong, Hanoi      | ST002
```

### Sheet 9: chart_of_accounts (hoặc ChartOfAccounts)
```
code | name                    | type      | parent_code
-----|-------------------------|-----------|-------------
100  | Tài sản                 | ASSET     |
110  | Tiền mặt                | ASSET     | 100
111  | Tiền Việt Nam           | ASSET     | 110
112  | Ngoại tệ                | ASSET     | 110
200  | Nguồn vốn               | LIABILITY |
210  | Vốn chủ sở hữu          | EQUITY    | 200
```

### Sheet 10: bank_accounts (hoặc BankAccounts)
```
store_code | bank_name     | account_number | currency
-----------|---------------|----------------|----------
ST001      | Vietcombank   | 0011001234567  | VND
ST001      | Techcombank   | 19123456789    | VND
ST002      | BIDV          | 12345678901    | VND
```

### Sheet 11: products (hoặc Products)
```
sku      | name              | description           | category_code | default_price | default_cost
---------|-------------------|-----------------------|---------------|---------------|-------------
PHONE001 | iPhone 15 Pro     | iPhone 15 Pro 256GB   | CAT002        | 29990000      | 25000000
PHONE002 | Samsung S24       | Samsung Galaxy S24    | CAT002        | 22990000      | 19000000
LAP001   | MacBook Pro M3    | MacBook Pro 14" M3    | CAT003        | 45990000      | 40000000
SHIRT001 | Men T-Shirt       | Cotton T-Shirt        | CAT005        | 299000        | 150000
```

### Sheet 12: product_variants (hoặc ProductVariants)
```
product_sku | sku           | barcode        | attributes                    | price     | cost      | active
------------|---------------|----------------|-------------------------------|-----------|-----------|-------
PHONE001    | PHONE001-BLK  | 8901234567890  | {"color":"Black"}             | 29990000  | 25000000  | TRUE
PHONE001    | PHONE001-WHT  | 8901234567891  | {"color":"White"}             | 29990000  | 25000000  | TRUE
PHONE002    | PHONE002-BLK  | 8901234567892  | {"color":"Black"}             | 22990000  | 19000000  | TRUE
LAP001      | LAP001-SLV    | 8901234567893  | {"color":"Silver"}            | 45990000  | 40000000  | TRUE
SHIRT001    | SHIRT001-M    | 8901234567894  | {"size":"M","color":"Blue"}   | 299000    | 150000    | TRUE
SHIRT001    | SHIRT001-L    | 8901234567895  | {"size":"L","color":"Blue"}   | 299000    | 150000    | TRUE
```

### Sheet 13: inventory (hoặc Inventory)
```
variant_sku  | warehouse_code | quantity | reserved
-------------|----------------|----------|----------
PHONE001-BLK | WH001          | 50       | 5
PHONE001-WHT | WH001          | 30       | 2
PHONE002-BLK | WH001          | 40       | 0
LAP001-SLV   | WH001          | 20       | 3
SHIRT001-M   | WH001          | 100      | 10
SHIRT001-L   | WH001          | 80       | 5
PHONE001-BLK | WH002          | 30       | 2
LAP001-SLV   | WH002          | 15       | 1
```

## Ghi chú:
1. Lưu file với tên `data.xlsx` ở thư mục gốc của project
2. Đảm bảo header (dòng đầu tiên) của mỗi sheet khớp chính xác với tên cột
3. Có thể sử dụng tên sheet viết hoa hoặc thường (ví dụ: roles hoặc Roles)
4. Các trường boolean: sử dụng TRUE/FALSE hoặc 1/0
5. Các trường JSON (attributes, settings): viết dạng JSON hợp lệ trong string
6. Để trống nếu field không bắt buộc (null)
7. Giá trị số không cần dấu phân cách hàng nghìn
