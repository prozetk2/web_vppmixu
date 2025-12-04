# API Contract

## Response Chuẩn
- Success: `{ data, meta? }`
- Error: `{ error: { code, message, details? }, meta? }`
- Pagination meta: `{ page, limit, total }`

## Auth
- `POST /auth/login`
  - Body: `{ email: string, password: string }`
  - Response 200: `{ data: { token: string, user: { id, email, role, name? } } }`
  - Error: 401 `INVALID_CREDENTIALS`
- `GET /auth/me`
  - Auth: Bearer JWT
  - Response 200: `{ data: { id, email, role, name? } }`
  - Error: 401 `UNAUTHORIZED`

## Products
- `GET /products`
  - Query: `page` (number, default 1), `limit` (number, default 20), `search?` (string), `categoryId?` (string), `includeDeleted?` (boolean)
  - Response 200: `{ data: Product[], meta: { page, limit, total } }`
- `POST /products`
  - Body: `{ name: string, barcode?: string, categoryId?: string, unitId: string, price: number, cost?: number, status?: 'ACTIVE'|'INACTIVE' }`
  - Rules: `barcode` unique if có, soft delete không trùng lại; validate price >= 0
  - Response 201: `{ data: Product }`
- `PUT /products/:id`
  - Body: giống POST (optional fields)
  - Response 200: `{ data: Product }`
- `DELETE /products/:id`
  - Soft delete
  - Response 200: `{ data: { id } }`

`Product` shape: `{ id, name, barcode?, categoryId?, unitId, price, cost?, status, createdAt, updatedAt, deletedAt? }`

## Categories
- `GET /categories`
  - Response 200: `{ data: Category[] }`
- `POST /categories`
  - Body: `{ name: string, code?: string, parentId?: string }`
  - Response 201: `{ data: Category }`
- `PUT /categories/:id`
  - Body: `{ name?: string, code?: string, parentId?: string }`
  - Response 200: `{ data: Category }`
- `DELETE /categories/:id`
  - Soft delete nếu cần
  - Response 200: `{ data: { id } }`

`Category` shape: `{ id, name, code?, parentId?, createdAt, updatedAt, deletedAt? }`

## Units
- `GET /units`
  - Response 200: `{ data: Unit[] }`
- `POST /units`
  - Body: `{ name: string, symbol?: string }`
  - Response 201: `{ data: Unit }`
- `PUT /units/:id`
  - Body: `{ name?: string, symbol?: string }`
  - Response 200: `{ data: Unit }`
- `DELETE /units/:id`
  - Response 200: `{ data: { id } }`

`Unit` shape: `{ id, name, symbol?, createdAt, updatedAt }`
