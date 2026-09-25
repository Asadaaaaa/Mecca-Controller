# SALES, INVENTORY, DISTRIBUTION & INVOICE MANAGEMENT SYSTEM
# DEVELOPMENT PLAN

---

## 1. PROJECT STRUCTURE

Project menggunakan pendekatan **Multi-Repository (Polyrepo)**, di mana setiap komponen utama merupakan **repository terpisah yang berdiri sendiri**:

```text
/ (Workspace Folder)
├── controller/          # [Repository Terpisah] Backend REST API (Node.js, Express, Sequelize, EssadaJS Architecture)
├── database/            # [Repository Terpisah] Database Migrations & Seeders (Sequelize CLI)
├── dashboard/           # [Repository Terpisah] Frontend SPA (React 19, TypeScript, Vite, Tailwind CSS v4, Shadcn UI)
└── Plan.md              # System Architecture & Development Plan
```

### 1.1 Controller (Backend API)
Backend application menggunakan:
* **Runtime**: Node.js (ES Modules, `"type": "module"`)
* **Framework**: Express.js
* **ORM**: Sequelize v6
* **Validator**: Ajv (JSON Schema validation)
* **Auth**: JWT (`jsonwebtoken`) & SHA-256 password hashing
* **Architecture**: **EssadaJS Layered Clean Architecture** (Controllers, Services, Repositories, Validators, Routes, Middlewares, Models, Helpers)
* **Subpath Imports**:
  * `#helpers` → `./src/helpers/index.js`
  * `#middlewaresPrimaryV1` → `./src/middlewares/index.js`
  * `#models` → `./src/models/index.js`
  * `#routesPrimaryV1` → `./src/routes/primary/v1/index.js`
  * `#controllersPrimaryV1` → `./src/controllers/primary/v1/index.js`
  * `#validatorsPrimaryV1` → `./src/validators/primary/v1/index.js`
  * `#repositoriesPrimaryV1` → `./src/repositories/primary/v1/index.js`
  * `#servicesPrimaryV1` → `./src/services/primary/v1/index.js`

**Tanggung Jawab Controller:**
* Menyediakan REST API dengan prefix `/primary/v1/...`
* Menjalankan Business Logic & Transaction Processing
* Melakukan validasi request payload via Ajv
* Mengatur Authentication & Authorization Middleware
* Standardisasi response format via `ResponsePresetHelper`
* Mengelola koneksi dan transaksi database runtime

### 1.2 Database (Migrations & Seeders)
Database project mandiri menggunakan:
* **Tooling**: Sequelize CLI (`sequelize-cli`)
* **Drivers**: `mysql2`, `pg`
* **Configuration**: `database/config.js` dan `.sequelizerc`
* **Migrations**: `database/migrations/`
* **Seeders**: `database/seeders/`

**Tanggung Jawab Database:**
* Version control skema database
* Menjalankan migrasi tabel (`npx sequelize-cli db:migrate`)
* Menjalankan seeder data awal/master
* Seluruh perubahan struktur tabel database **wajib** dilakukan melalui file migration di folder `database/migrations/`.

### 1.3 Dashboard (Frontend Web App)
Frontend Single Page Application menggunakan:
* **Framework**: React 19 + Vite 8
* **Bahasa**: TypeScript (`.tsx`)
* **Styling**: Tailwind CSS v4 + `tw-animate-css`
* **UI Components**: Shadcn UI + Radix UI / Base UI
* **Icons**: Lucide React
* **Routing**: React Router DOM v7

**Tanggung Jawab Dashboard:**
* Tampilan antarmuka (User Interface) modern, responsif, dan interaktif
* Dukungan Dark Mode & Light Mode (`theme-provider`)
* Form input, data table, filtering, pagination, dialog, dan interaksi transaksi
* Visualisasi metrik ringkasan penjualan, invoice, dan inventaris
* Komunikasi asynchronous dengan backend controller (`/primary/v1/...`)

---

## 2. DEVELOPMENT PRINCIPLES

### 2.1 Layered Clean Architecture (EssadaJS Pattern)

Setiap domain bisnis di backend diorganisasi melalui pemisahan tanggung jawab (*Separation of Concerns*) berbasis layer di `controller/src/`:

```text
controller/src/
├── routes/primary/v1/         # Endpoint definition & HTTP method mapping
├── middlewares/primary/v1/    # Authorization, permission guard & request interceptors
├── controllers/primary/v1/    # Request intake, validation execution, preset response
├── validators/primary/v1/     # Ajv JSON Schema definitions
├── services/primary/v1/       # Core business logic, domain rules, DB transaction boundaries
├── repositories/primary/v1/   # Database query abstraction & Sequelize model operations
├── models/                    # Sequelize runtime model schema definitions
└── helpers/                   # Reusable utilities (JWT, SHA256, Logger, ResponsePreset)
```

**Alur Eksekusi Request:**
1. **Client (Dashboard)** mengirim HTTP request ke endpoint `/primary/v1/{module}`.
2. **Route** menerima request dan mengeksekusi **Middleware** (misal verifikasi JWT token).
3. **Controller** memvalidasi schema body/query menggunakan **Validator** (Ajv). Jika gagal, mengembalikan response error 400 format `ResponsePreset`.
4. **Controller** memanggil method pada **Service**.
5. **Service** memproses aturan bisnis, membuka transaksi database (`Sequelize Transaction`) jika diperlukan, dan memanggil **Repository**.
6. **Repository** berinteraksi dengan database via **Model**.
7. **Service** mengembalikan data hasil proses ke Controller.
8. **Controller** merespons Client dengan format seragam melalui `ResponsePreset.resOK()`.

### 2.2 Transaction Based
Seluruh transaksi harus memiliki:
* Nomor transaksi unik (`QT-...`, `SO-...`, `DO-...`, `INV-...`, `PAY-...`)
* Tanggal transaksi
* Status transaksi
* User pembuat (`created_by`)
* Audit timestamps (`created_at`, `updated_at`)

Transaksi tidak boleh mengubah data master secara langsung tanpa menyimpan jejak riwayat audit yang lengkap.

### 2.3 Auditability & Traceability
Setiap tahapan transaksi harus dapat ditelusuri hubungannya:

```text
Quotation
    ↓ (convert)
Sales Order
    ↓ (delivery)
Delivery
    ↓ (invoicing)
Invoice
    ↓ (payment allocation)
Payment
```

User dapat mengetahui asal transaksi dan dokumen terkait langsung dari halaman detail transaksi.

### 2.4 Authentication & Token Lifecycle Policy
Sistem menerapkan autentikasi berbasis JSON Web Token (JWT) dengan aturan masa berlaku dan penyegaran (*sliding session*) sebagai berikut:

* **Masa Aktif Token (TTL)**:
  * Access Token berlaku selama **3 jam** (`expiresIn: '3h'`).
* **Mekanisme Refresh Token (Aktivitas 1.5 Jam)**:
  * Jika dalam waktu **1 jam 30 menit (90 menit)** pengguna memiliki aktivitas (mengirim request ke server), maka sistem akan melakukan **Refresh Token**.
  * Masa aktif token diperpanjang kembali menjadi **3 jam** dari waktu aktivitas terakhir, sehingga pengguna aktif tidak terputus sesinya saat sedang bekerja.
  * Refresh dapat dipicu melalui request interceptor frontend ke endpoint `POST /primary/v1/auth/refresh-token` atau melalui response header dari backend.
* **Penanganan Token Expired / Invalid (Redirect ke `/login`)**:
  * Jika token **tidak valid** (rusak/dimanipulasi, code `-2`) atau **telah kedaluwarsa** (tidak ada aktivitas lebih dari 3 jam, code `-3`), backend merespons dengan HTTP status **401 Unauthorized**.
  * Frontend Dashboard secara otomatis menangkap status 401 via HTTP Interceptor, menghapus credential lokal (token/user data), dan **seketika melempar (redirect) pengguna ke halaman `/login`** dengan notifikasi bahwa sesi telah habis.

---

## 3. CORE DATABASE SCHEMA

### 3.1 Core Master & Auth Tables

#### users
```text
id                  BIGINT (PK, Auto Increment)
uuid                UUID (Default: gen_random_uuid())
name                VARCHAR / TEXT
email               VARCHAR / TEXT
username            VARCHAR / TEXT
password            VARCHAR / TEXT (Hashed SHA-256)
status              VARCHAR (active, inactive, suspended)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### roles
```text
id                  BIGINT (PK, Auto Increment)
name                VARCHAR (e.g. superadmin, admin, sales, warehouse, finance)
description         TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### permissions
```text
id                  BIGINT (PK, Auto Increment)
name                VARCHAR (e.g. sales_order.create, invoice.approve)
description         TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### role_permissions
```text
id                  BIGINT (PK, Auto Increment)
role_id             BIGINT (FK -> roles.id)
permission_id       BIGINT (FK -> permissions.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### user_roles
```text
id                  BIGINT (PK, Auto Increment)
user_id             BIGINT (FK -> users.id)
role_id             BIGINT (FK -> roles.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

### 3.2 Customer

#### customers
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (Unique, e.g. CUST-2026-000001)
name                VARCHAR (Nama Customer / Perusahaan)
pic_name            VARCHAR (Nama Person in Charge)
phone               VARCHAR (Nomor Telepon)
email               VARCHAR (Email)
address             TEXT (Alamat Lengkap)
payment_terms       INTEGER (Jatuh Tempo Pembayaran, default 30 hari)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

*Catatan: Customer murni entitas master pembeli/klien dan BUKAN Warehouse. Data transaksi seperti riwayat belanja (lifetime spend), piutang belum tertagih (total unpaid), dan tanggal kunjungan dihitung secara dinamis dari relasi tabel transaksi penjualan & invoice.*

---

### 3.3 Warehouse

#### warehouses
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (Unique, e.g. WH-001)
name                VARCHAR
address             TEXT
pic_name            VARCHAR
status              VARCHAR (active, inactive)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

*Catatan: Pada tahap awal sistem beroperasi dengan satu warehouse utama, namun seluruh skema database telah dirancang siap mendukung multiple warehouse.*

---

### 3.4 Product & Master Items

#### product_categories
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (Unique, e.g. CAT-001)
name                VARCHAR
description         TEXT
status              VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### units
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (e.g. PCS, BOX, DUS, KG)
name                VARCHAR
description         TEXT
status              VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### products
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (Unique, e.g. PRD-001)
name                VARCHAR
category_id         BIGINT (FK -> product_categories.id)
unit_id             BIGINT (FK -> units.id)
selling_price       DECIMAL(15, 2)
tax_id              BIGINT (FK -> taxes.id, Nullable)
status              VARCHAR (active, inactive)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

*Catatan: Harga produk bersifat global.*

---

### 3.5 Tax

#### taxes
```text
id                  BIGINT (PK, Auto Increment)
code                VARCHAR (e.g. PPN11, PPN12, NON)
name                VARCHAR
rate                DECIMAL(5, 2) (e.g. 11.00, 12.00)
status              VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

### 3.6 System Settings & Security

#### system_settings
```text
id                  BIGINT (PK, Auto Increment)
key                 VARCHAR(100) (Unique, e.g. security_pin_enabled, security_pin_hash, force_sales_order_enabled)
value               TEXT
description         TEXT
updated_by          BIGINT (FK -> users.id, Nullable)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

*Catatan: Menyimpan konfigurasi global operasional sistem seperti status aktivasi PIN otorisasi (`security_pin_enabled`), hash PIN 6 digit (`security_pin_hash`), dan kebijakan pemesanan stok minus / force sales order (`force_sales_order_enabled`).*

---

## 4. INVENTORY DATABASE

### 4.1 Warehouse Stock

#### warehouse_stocks
```text
id                  BIGINT (PK, Auto Increment)
warehouse_id        BIGINT (FK -> warehouses.id)
product_id          BIGINT (FK -> products.id)
quantity            DECIMAL(12, 2) (Default: 0)
created_at          TIMESTAMP
updated_at          TIMESTAMP

CONSTRAINT: UNIQUE(warehouse_id, product_id)
```

Satu produk memiliki tepat satu baris stok di setiap warehouse.

### 4.2 Stock Movements

#### stock_movements
```text
id                  BIGINT (PK, Auto Increment)
warehouse_id        BIGINT (FK -> warehouses.id)
product_id          BIGINT (FK -> products.id)
type                VARCHAR (STOCK_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, SALES_DELIVERY)
quantity            DECIMAL(12, 2)
stock_before        DECIMAL(12, 2)
stock_after         DECIMAL(12, 2)
reference_type      VARCHAR (e.g. deliveries, adjustments, stock_ins)
reference_id        BIGINT
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
```

Setiap perubahan kuantitas stok wajib mencatat baris di `stock_movements`.

---

## 5. SALES QUOTATION

### 5.1 Tables

#### quotations
```text
id                  BIGINT (PK, Auto Increment)
quotation_number    VARCHAR (Unique, e.g. QT-2026-000001)
customer_id         BIGINT (FK -> customers.id)
quotation_date      DATE
valid_until         DATE
subtotal            DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2) (Default: 0)
tax_amount          DECIMAL(15, 2) (Default: 0)
grand_total         DECIMAL(15, 2)
status              VARCHAR (DRAFT, SENT, APPROVED, REJECTED, EXPIRED)
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### quotation_items
```text
id                  BIGINT (PK, Auto Increment)
quotation_id        BIGINT (FK -> quotations.id)
product_id          BIGINT (FK -> products.id)
quantity            DECIMAL(12, 2)
unit_price          DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2) (Default: 0)
tax_amount          DECIMAL(15, 2) (Default: 0)
subtotal            DECIMAL(15, 2)
total               DECIMAL(15, 2)
```

### 5.2 Flow
`Draft` → `Sent` → `Approved` (dapat dikonversi ke Sales Order) atau `Rejected`.

---

## 6. SALES ORDER

### 6.1 Tables

#### sales_orders
```text
id                  BIGINT (PK, Auto Increment)
sales_order_number  VARCHAR (Unique, e.g. SO-2026-000001)
customer_id         BIGINT (FK -> customers.id)
quotation_id        BIGINT (FK -> quotations.id, Nullable)
order_date          DATE
subtotal            DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2)
tax_amount          DECIMAL(15, 2)
grand_total         DECIMAL(15, 2)
status              VARCHAR (DRAFT, CONFIRMED, PARTIALLY_DELIVERED, FULLY_DELIVERED, CANCELLED)
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### sales_order_items
```text
id                  BIGINT (PK, Auto Increment)
sales_order_id      BIGINT (FK -> sales_orders.id)
product_id          BIGINT (FK -> products.id)
quantity            DECIMAL(12, 2)
unit_price          DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2)
tax_amount          DECIMAL(15, 2)
subtotal            DECIMAL(15, 2)
total               DECIMAL(15, 2)
```

### 6.2 Aturan Bisnis Sales Order
* Sales Order dapat dibuat dari Quotation yang berstatus `APPROVED` ataupun dibuat langsung tanpa Quotation.
* **Sales Order TIDAK memotong stok gudang.** Pemotongan stok terjadi saat Delivery dikonfirmasi.

### 6.3 Kebijakan Pemesanan Stok & Force Create Sales Order
* **Pemeriksaan Ketersediaan Stok**:
  * Saat Sales Order dibuat, sistem membandingkan kuantitas yang diminta dengan stok tersedia (`available_stock = physical_stock - reserved_stock_active_so`).
* **Alur Validasi & Bypass Otorisasi PIN**:
  * **Kondisi 1 — Stok Cukup**: Sales Order langsung dibuat secara normal tanpa memerlukan otorisasi PIN.
  * **Kondisi 2 — Stok Kurang & Toggle Force Create SO Nonaktif**: Sistem menolak pembuatan Sales Order dan mengembalikan pesan error validasi bahwa stok tidak mencukupi serta menyarankan penyesuaian kuantitas.
  * **Kondisi 3 — Stok Kurang & Toggle Force Create SO Aktif**:
    1. Frontend Dashboard menampilkan modal dialog otorisasi: *"Stok tidak mencukupi! Masukkan PIN 6 Digit untuk melanjutkan pembuatan Sales Order (Paksa Buat / Backorder)"*.
    2. Modal menyajikan rincian item dengan stok kurang (stok fisik, terpesan, tersedia, dan jumlah yang diminta).
    3. Pengguna memasukkan PIN 6 digit angka yang valid.
    4. Request dikirim ke backend dengan payload tambahan `{ force_override: true, pin: "xxxxxx" }`.
    5. Backend memvalidasi status toggle `force_sales_order_enabled` dan memverifikasi hash PIN. Jika valid, Sales Order berhasil dibuat dan tercatat audit log bahwa pesanan ini dibuat melalui otorisasi khusus (Force Create / Backorder).
* **Prinsip Keamanan Inventaris**:
  * Sales Order bersifat komitmen pesanan komersial (*order commitment*) dan **TIDAK** memotong stok fisik gudang. Oleh karena itu, Sales Order dengan stok kurang aman dibuat tanpa menimbulkan stok minus pada saldo fisik.

---

## 7. SALES DELIVERY (SURAT JALAN)

### 7.1 Tables

#### deliveries
```text
id                  BIGINT (PK, Auto Increment)
delivery_number     VARCHAR (Unique, e.g. DO-2026-000001)
sales_order_id      BIGINT (FK -> sales_orders.id)
warehouse_id        BIGINT (FK -> warehouses.id)
customer_id         BIGINT (FK -> customers.id)
delivery_date       DATE
status              VARCHAR (DRAFT, CONFIRMED, CANCELLED)
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### delivery_items
```text
id                  BIGINT (PK, Auto Increment)
delivery_id         BIGINT (FK -> deliveries.id)
sales_order_item_id BIGINT (FK -> sales_order_items.id)
product_id          BIGINT (FK -> products.id)
quantity            DECIMAL(12, 2)
```

### 7.2 Partial Delivery & Stock Deduction
* Satu Sales Order dapat dikirim melalui beberapa kali Delivery (Partial Delivery).
* Total kuantitas terkirim dari seluruh Delivery tidak boleh melebihi kuantitas yang dipesan pada Sales Order.
* Saat Delivery dikonfirmasi (`POST /primary/v1/deliveries/:id/confirm`):
  1. Validasi kecukupan stok di Warehouse terkait.
  2. Kurangi `warehouse_stocks.quantity`.
  3. Catat riwayat di `stock_movements` dengan type `SALES_DELIVERY`.
  4. Perbarui status Delivery menjadi `CONFIRMED`.
  5. Perbarui status Sales Order (`PARTIALLY_DELIVERED` atau `FULLY_DELIVERED`).

### 7.3 Restriksi Mutlak Pengiriman (Zero Negative Stock Guardrail)
* **Prinsip Utama: Mencegah Terjadinya Stok Minus**:
  * Pengurangan kuantitas stok fisik riil di gudang (`warehouse_stocks.quantity`) terjadi **eksklusif pada saat pengiriman (Delivery)**.
  * Meskipun Sales Order diizinkan dibuat dengan status backorder (melebihi stok yang ada melalui otorisasi PIN), proses **Pengiriman (Delivery / Surat Jalan) DIBATASI KETAT TANPA TOLERANSI (RESTRICTED)**.
* **Aturan Restriksi Mutlak Pengiriman**:
  1. **Validasi Kuantitas Kirim $\le$ Saldo Stok Fisik Riil**: Sistem tidak memperbolehkan penerbitan surat jalan jika kuantitas barang yang akan dikirim melebihi saldo fisik riil di gudang (`ship_quantity <= physical_stock`).
  2. **Tanpa Opsi Bypass PIN pada Pengiriman**: Tidak ada opsi PIN bypass untuk pengiriman barang yang fisiknya tidak ada di gudang. Hal ini menjamin bahwa saldo stok di database tidak pernah bernilai negatif (mines).
  3. **Mekanisme Operasional Pemenuhan Pesanan**:
     * **Partial Delivery (Kirim Bertahap)**: Jika stok hanya tersedia sebagian, buat Surat Jalan hanya untuk kuantitas yang tersedia.
     * **Menunggu Restok / Penerimaan Barang**: Untuk sisa barang yang stoknya belum ada di gudang, pengiriman ditahan hingga bagian gudang melakukan transaksi Penerimaan Stok (*Stock In* / Penyesuaian). Setelah stok fisik tercatat bertambah, barulah Surat Jalan berikutnya dapat diterbitkan.

---

## 8. INVOICE

### 8.1 Tables

#### invoices
```text
id                  BIGINT (PK, Auto Increment)
invoice_number      VARCHAR (Unique, e.g. INV-2026-000001)
customer_id         BIGINT (FK -> customers.id)
invoice_date        DATE
due_date            DATE
subtotal            DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2)
tax_amount          DECIMAL(15, 2)
grand_total         DECIMAL(15, 2)
paid_amount         DECIMAL(15, 2) (Default: 0)
status              VARCHAR (DRAFT, UNPAID, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED)
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### invoice_items
```text
id                  BIGINT (PK, Auto Increment)
invoice_id          BIGINT (FK -> invoices.id)
product_id          BIGINT (FK -> products.id)
delivery_id         BIGINT (FK -> deliveries.id)
quantity            DECIMAL(12, 2)
unit_price          DECIMAL(15, 2)
discount_amount     DECIMAL(15, 2)
tax_amount          DECIMAL(15, 2)
subtotal            DECIMAL(15, 2)
total               DECIMAL(15, 2)
```

### 8.2 Hubungan Invoice & Delivery
* Invoice dibuat berdasarkan Delivery yang telah dikonfirmasi.
* Mendukung 1 Delivery → 1 Invoice, atau Menggabungkan beberapa Delivery → 1 Invoice konsolidasi.
* Kuantitas yang ditagih tidak boleh melebihi kuantitas yang telah dikirim.

---

## 9. PAYMENT RECEIPT

### 9.1 Tables

#### payments
```text
id                  BIGINT (PK, Auto Increment)
payment_number      VARCHAR (Unique, e.g. PAY-2026-000001)
customer_id         BIGINT (FK -> customers.id)
payment_date        DATE
amount              DECIMAL(15, 2)
payment_method      VARCHAR (Cash, Transfer, Giro, Other)
reference_number    VARCHAR (e.g. Bukti Transfer / No Cek)
notes               TEXT
created_by          BIGINT (FK -> users.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### payment_allocations
```text
id                  BIGINT (PK, Auto Increment)
payment_id          BIGINT (FK -> payments.id)
invoice_id          BIGINT (FK -> invoices.id)
allocated_amount    DECIMAL(15, 2)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### 9.2 Aturan Pembayaran
* Hubungan many-to-many: Satu payment dapat dialokasikan ke beberapa invoice, dan satu invoice dapat menerima alokasi dari beberapa payment.
* Total alokasi tidak boleh melebihi nominal `payment.amount`.
* Alokasi ke invoice tidak boleh melebihi sisa tagihan invoice (`invoice.grand_total - invoice.paid_amount`).
* Status invoice secara otomatis bergeser: `PARTIALLY_PAID` jika sisa tagihan > 0, atau `PAID` jika lunas.

---

## 10. API ARCHITECTURE & ENDPOINTS

Backend menyajikan endpoint REST API terstandarisasi dengan prefix versioning `/primary/v1/` sesuai konfigurasi `APIVersions.json` dan `PrimaryHandlerV1`.

### 10.1 Standard Response Format (`ResponsePresetHelper`)

```json
// Respon Sukses (HTTP 200/201)
{
  "status": 200,
  "message": "OK",
  "data": { ... }
}

// Respon Error (HTTP 400/401/403/404/500)
{
  "status": 400,
  "message": "Validation Error / Not Found",
  "err": {
    "type": "validator",
    "details": { ... }
  }
}
```

### 10.2 Daftar Endpoint Group

#### Authentication & Settings
* `POST /primary/v1/auth/login` — Login pengguna & generasi access token JWT (TTL 3 jam) beserta refresh token
* `POST /primary/v1/auth/refresh-token` — Refresh access token (memperpanjang masa aktif 3 jam jika ada aktivitas dalam 1.5 jam)
* `GET /primary/v1/auth/me` — Profil pengguna terautentikasi
* `GET /primary/v1/users` — Daftar pengguna (Settings: Daftar Users)
* `POST /primary/v1/users` — Tambah pengguna baru
* `GET /primary/v1/users/:id` — Detail pengguna
* `PUT /primary/v1/users/:id` — Edit data pengguna
* `DELETE /primary/v1/users/:id` — Hapus / nonaktifkan pengguna
* `GET /primary/v1/warehouses` — Daftar gudang (Settings: Daftar Warehouse)
* `POST /primary/v1/warehouses`, `GET /:id`, `PUT /:id`, `DELETE /:id`
* `GET /primary/v1/roles` & `GET /primary/v1/permissions` — Master Role & Hak Akses
* `GET /primary/v1/settings/system` — Ambil konfigurasi sistem (status keamanan PIN, status toggle Force SO)
* `PUT /primary/v1/settings/system/pin` — Atur/ubah PIN 6 digit angka dan toggle status aktif PIN
* `PUT /primary/v1/settings/system/force-sales-order` — Atur toggle "Force Create Sales Order" (memerlukan verifikasi PIN jika PIN aktif)
* `POST /primary/v1/settings/system/verify-pin` — Verifikasi keabsahan PIN 6 digit untuk otorisasi tindakan sensitif

#### Customers
* `GET /primary/v1/customers` — Daftar Customer
* `POST /primary/v1/customers` — Tambah customer baru
* `GET /primary/v1/customers/:id` — Detail customer & terms
* `PUT /primary/v1/customers/:id` — Edit customer
* `DELETE /primary/v1/customers/:id` — Nonaktifkan customer

#### Produk & Kategori
* Categories: `GET /primary/v1/product-categories`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
* Units: `GET /primary/v1/units`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
* Products: `GET /primary/v1/products`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
* Taxes: `GET /primary/v1/taxes`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`

#### Inventaris dan Stok
* `GET /primary/v1/inventory/stocks` — Daftar Stok per gudang & produk
* `POST /primary/v1/inventory/stock-in` — Penerimaan stok awal / masuk
* `POST /primary/v1/inventory/opname` — Stok Opname (penyesuaian fisik)
* `POST /primary/v1/inventory/waste` — Stok Terbuang (pencatatan barang rusak/hilang/kadaluwarsa)
* `GET /primary/v1/inventory/movements` — Riwayat kartu mutasi stok lengkap

#### Penjualan (Sales)
* **Penawaran (Quotations)**: `GET /primary/v1/quotations`, `POST`, `GET /:id`, `PUT /:id`, `POST /:id/approve`, `POST /:id/reject`, `POST /:id/convert-to-order`
* **Pesanan (Sales Orders)**: `GET /primary/v1/sales-orders`, `POST` (mendukung `force_override: true` & `pin` saat stok kurang), `GET /:id`, `PUT /:id`, `POST /:id/confirm`
* **Surat Jalan (Deliveries)**: `GET /primary/v1/deliveries` (menolak jika kuantitas kirim > stok fisik riil), `POST`, `GET /:id`, `POST /:id/confirm` (eksekusi pemotongan stok gudang riil, restriksi mutlak tanpa minus)
* **Daftar Invoice**: `GET /primary/v1/invoices`, `POST`, `GET /:id`, `POST /:id/cancel`
* **Daftar Payments**: `GET /primary/v1/payments`, `POST`, `GET /:id`, `POST /:id/allocate`

#### Dashboard Overview
* `GET /primary/v1/dashboard/metrics` — Metrik KPI (Total Penjualan, Penjualan Belum Dibayar, Penjualan Terbayar, Transaksi) terfilter parameter `start_date` dan `end_date`
* `GET /primary/v1/dashboard/recent-transactions` — 5 transaksi penjualan terkini (Sales Orders / Invoices)

---

## 11. API PATTERN & DATABASE TRANSACTION

Setiap aksi transaksi operasional wajib dieksekusi di dalam **Sequelize Managed Transaction** untuk menjamin sifat ACID:

```javascript
// Pola eksekusi di Service layer:
const result = await server.model.db.transaction(async (t) => {
    // 1. Validasi kecukupan stok / status dokumen
    // 2. Insert / Update baris transaksi
    // 3. Mutasi stok jika delivery
    // 4. Catat stock movement
    // Return data hasil proses
});
```

Jika terjadi error pada tahapan mana pun, transaksi otomatis melakukan **ROLLBACK** sehingga tidak terjadi inkonsistensi data.

---

## 12. BACKEND & DATABASE FOLDER STRUCTURE

Struktur aktual pada direktori `controller/` dan `database/`:

```text
controller/
├── src/
│   ├── controllers/
│   │   └── primary/
│   │       └── v1/
│   │           ├── Auth.controller.js
│   │           ├── Customer.controller.js
│   │           ├── Product.controller.js
│   │           ├── Quotation.controller.js
│   │           ├── SalesOrder.controller.js
│   │           ├── Delivery.controller.js
│   │           ├── Invoice.controller.js
│   │           ├── Payment.controller.js
│   │           └── index.js
│   ├── services/
│   │   └── primary/
│   │       └── v1/
│   │           ├── Auth.service.js
│   │           ├── Customer.service.js
│   │           ├── Product.service.js
│   │           ├── Quotation.service.js
│   │           ├── SalesOrder.service.js
│   │           ├── Delivery.service.js
│   │           ├── Invoice.service.js
│   │           ├── Payment.service.js
│   │           └── index.js
│   ├── repositories/
│   │   └── primary/
│   │       └── v1/
│   │           ├── User.repository.js
│   │           ├── Customer.repository.js
│   │           ├── Product.repository.js
│   │           ├── Quotation.repository.js
│   │           ├── SalesOrder.repository.js
│   │           ├── Delivery.repository.js
│   │           ├── Invoice.repository.js
│   │           ├── Payment.repository.js
│   │           └── index.js
│   ├── validators/
│   │   └── primary/
│   │       └── v1/
│   │           ├── Auth.validator.js
│   │           ├── Customer.validator.js
│   │           └── index.js
│   ├── routes/
│   │   ├── Handler.route.js
│   │   └── primary/
│   │       └── v1/
│   │           ├── Auth.route.js
│   │           ├── Customer.route.js
│   │           ├── Handler.route.js
│   │           └── index.js
│   ├── middlewares/
│   │   ├── Handler.middleware.js
│   │   ├── primary/
│   │   │   └── v1/
│   │   │       └── Authorization.middleware.js
│   │   └── index.js
│   ├── models/
│   │   ├── Handler.model.js
│   │   ├── Users.model.js
│   │   ├── Customers.model.js
│   │   └── index.js
│   ├── helpers/
│   │   ├── FileSystem.helper.js
│   │   ├── JWT.helper.js
│   │   ├── Logger.helper.js
│   │   ├── ResponsePreset.helper.js
│   │   ├── SHA256.helper.js
│   │   └── index.js
│   └── Main.js
├── storage/
│   └── configs/
│       ├── 404.html
│       └── APIVersions.json
├── package.json
└── .env

database/
├── database/
│   └── config.js            # Konfigurasi koneksi per environment
├── migrations/              # Berkas migrasi database Sequelize
│   ├── 20260907000001-create-users.js
│   └── ...
├── seeders/                 # Berkas seeder data awal
├── .sequelizerc             # Konfigurasi path Sequelize CLI
├── package.json
└── .env
```

---

## 13. DASHBOARD FRONTEND STRUCTURE

Struktur aktual pada direktori `dashboard/` (React 19 + TypeScript + Vite + Shadcn UI):

```text
dashboard/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                    # Komponen primitif (button, card, dialog, input, sidebar, etc.)
│   │   ├── app-sidebar.tsx        # Navigasi sidebar modular ERP Mecca (collapsible & resizable)
│   │   ├── nav-main.tsx           # Menu navigasi modul utama & sub modul collapsible
│   │   ├── nav-user.tsx           # User profile avatar, role badge & functional logout
│   │   ├── team-switcher.tsx      # Identitas bisnis (Mecca)
│   │   ├── theme-provider.tsx     # Pengatur tema Dark/Light
│   │   ├── login-form.tsx         # Komponen form login terintegrasi API
│   │   └── date-range-picker.tsx  # Pemilih rentang tanggal & preset periode
│   ├── pages/
│   │   ├── dashboard-page.tsx     # Halaman ringkasan dashboard KPI & Date Range
│   │   ├── login-page.tsx         # Halaman autentikasi login
│   │   ├── customers/             # Halaman data pelanggan
│   │   ├── products/              # Halaman master produk & kategori
│   │   ├── inventory/             # Halaman daftar stok, opname, stok terbuang
│   │   ├── sales-orders/          # Halaman penjualan (penawaran, pesanan, pengiriman penjualan, invoice)
│   │   └── settings/              # Halaman settings (daftar users, daftar warehouse)
│   ├── hooks/
│   │   └── use-mobile.ts          # Responsive breakpoint detector
│   ├── services/                  # HTTP Client wrapper (Axios ke /primary/v1/...)
│   │   ├── api-client.ts          # Axios instance, sliding session 1.5h, auto-redirect 401
│   │   ├── auth.service.ts        # Service autentikasi login, refresh token, logout, profile
│   │   └── ...
│   ├── types/                     # TypeScript interfaces & definitions
│   │   ├── auth.types.ts
│   │   ├── master.types.ts
│   │   └── transaction.types.ts
│   ├── lib/
│   │   └── utils.ts               # Utility fungsi (cn helper Tailwind)
│   ├── App.tsx                    # Routing utama dengan ProtectedRoute guard
│   ├── main.tsx                   # Titik masuk aplikasi React
│   └── index.css                  # Desain tema & utility Tailwind CSS v4
├── components.json                # Shadcn UI registry metadata
├── vite.config.ts                 # Konfigurasi build Vite, alias, dan proxy /primary -> :3000
├── tsconfig.json                  # Konfigurasi TypeScript
├── package.json
└── index.html
```

---

## 14. DASHBOARD PAGES & ROUTING

| Path Route | Deskripsi Halaman | Fitur Utama |
| :--- | :--- | :--- |
| `/login` | Autentikasi Pengguna | Form login identity & password, validasi & auto-redirect |
| `/` atau `/dashboard` | Dashboard Overview | Metrik Utama (Total Penjualan, Penjualan Belum Dibayar, Penjualan Terbayar, Transaksi), Date Range Picker interaktif, Analisis Rasio Pembayaran, Transaksi Terkini |
| `/customers` | Modul Customers | Sub modul: Daftar Customer (`/customers`) |
| `/products` | Modul Produk & Kategori | Sub modul: Daftar Produk (`/products`), Daftar Kategori (`/products/categories`) |
| `/inventory` | Modul Inventaris dan Stok | Sub modul: Daftar Stok (`/inventory`), Stok Opname (`/inventory/opname`), Stok Terbuang (`/inventory/waste`) |
| `/sales-orders` | Modul Penjualan | Sub modul: Daftar Penawaran Penjualan (`/quotations`), Daftar Pesanan Penjualan (`/sales-orders`), Daftar Pengiriman Penjualan (`/deliveries`), Daftar Invoice (`/invoices`), Daftar Payments (`/payments`) |
| `/settings` | Modul Settings | Sub modul: Daftar Users (`/settings/users`), Role & Hak Akses (`/settings/roles`), Daftar Warehouse (`/settings/warehouses`), Pengaturan Sistem (`/settings/system`) |
| `/settings/system` | Pengaturan Sistem & Keamanan | Toggle Keamanan PIN, Buat/Ubah PIN 6-digit angka, Toggle Force Create Sales Order saat stok kurang |

> [!IMPORTANT]
> **Route Protection & Auto-Redirect Policy:**
> * Seluruh rute dashboard (selain `/login`) merupakan **Protected Routes** yang mewajibkan autentikasi aktif.
> * Jika pengguna belum login, token tidak valid (code `-2`), atau token telah kedaluwarsa (code `-3`), maka HTTP Interceptor frontend dan Route Guard akan langsung menghapus token lokal dan **me-redirect pengguna seketika ke halaman `/login`**.
> * Saat request dilakukan oleh pengguna yang aktif dalam rentang **1.5 jam**, HTTP client secara transparan menyegarkan (*refresh*) token ke endpoint `/primary/v1/auth/refresh-token` agar sesi tetap berjalan mulus.

---

## 15. DOCUMENT NUMBERING FORMAT

Nomor dokumen digenerasi otomatis dengan nomor urut yang rapi dan unique:

* Quotation: `QT-YYYY-XXXXXX` (contoh: `QT-2026-000001`)
* Sales Order: `SO-YYYY-XXXXXX` (contoh: `SO-2026-000001`)
* Delivery: `DO-YYYY-XXXXXX` (contoh: `DO-2026-000001`)
* Invoice: `INV-YYYY-XXXXXX` (contoh: `INV-2026-000001`)
* Payment: `PAY-YYYY-XXXXXX` (contoh: `PAY-2026-000001`)

---

## 16. TRANSACTION RELATIONSHIP MAP

```text
Quotation: QT-2026-000001
        │
        ▼ (approve & convert)
Sales Order: SO-2026-000001
        │
        ├───────────────────────┐
        ▼                       ▼
Delivery: DO-001        Delivery: DO-002
(60 PCS)                (40 PCS)
        │                       │
        └───────────┬───────────┘
                    ▼ (create invoice)
            Invoice: INV-2026-000001
                    │
                    ▼ (payment allocation)
            Payment: PAY-2026-000001
```

---

## 17. BUSINESS VALIDATION RULES

1. **Sales Order**:
   * Kuantitas item wajib > 0.
   * Customer wajib berstatus aktif.
2. **Delivery**:
   * Kuantitas yang dikirim tidak boleh melebihi sisa kuantitas pada Sales Order (`delivered_quantity <= remaining_so_quantity`).
   * Kuantitas yang dikirim tidak boleh melebihi stok yang tersedia di Warehouse (`delivery_quantity <= available_stock`).
3. **Invoice**:
   * Tidak boleh menerbitkan invoice melebihi kuantitas barang yang telah dikirim via Delivery (`invoiced_quantity <= delivered_quantity`).
4. **Payment**:
   * Total alokasi payment tidak boleh melebihi nominal `payment.amount`.
   * Alokasi pada suatu invoice tidak boleh melebihi sisa kewajiban tagihan (`remaining_invoice_amount`).

---

## 18. IMPLEMENTATION STATUS & PHASES

### Phase 1 — Foundation & Authentication (Status: COMPLETED / 100%)
- [x] Inisialisasi 3 repository terpisah (`controller/`, `database/`, `dashboard/`)
- [x] Setup Frontend React 19 + TypeScript + Vite + Tailwind CSS v4 + Shadcn UI
- [x] Tampilan antarmuka Login (`login-page.tsx`) & Dashboard Overview (`dashboard-page.tsx`)
- [x] Sidebar navigasi interaktif (`app-sidebar.tsx`) & Theme toggle
- [x] Backend Controller base setup (EssadaJS layered clean architecture)
- [x] Migrasi tabel user awal (`database/migrations/20260907000001-create-users.js`)
- [x] Auth scaffolding di backend (`Auth.controller.js`, `Auth.service.js`, `User.repository.js`, `Auth.validator.js`, `Authorization.middleware.js`)
- [x] Aktivasi arsitektur database Sequelize runtime & model di `controller` (`Handler.model.js`, `Users`, `Roles`, `Permissions`, `UserRoles`, `RolePermissions`)
- [x] Migrasi tabel Role, Permission, Role Permissions, User Roles & initial superadmin seeder
- [x] Integrasi penuh autentikasi Login dari Dashboard ke Controller (`/primary/v1/auth/login`) dengan token storage, sliding session refresh (1.5 jam aktivitas), dan auto redirect ke `/login` jika token expired/invalid (401)
- [x] Dashboard Overview UI dengan 4 metrik KPI (Total Penjualan, Penjualan Belum Dibayar, Penjualan Terbayar, Transaksi) dan Date Range Picker interaktif

### Phase 2 — Customers & Settings (Status: COMPLETED / 100%)
- [x] Migrasi tabel: `customers` (`20260907000006-create-customers.js`) & seeder 164 data customer (`20260907000002-seed-customers.js`)
- [x] Backend Customers: `Customer.route.js`, `Customer.validator.js`, `Customer.controller.js`, `Customer.service.js`, `Customer.repository.js`, `Customers.model.js` (CRUD, KPI metric, batch delete)
- [x] Frontend Modul Customers: `/customers` (4 kartu KPI, pencarian, filter hutang, multi-select checkbox, modal dialog tambah/edit customer, export CSV, batch delete)
- [x] Migrasi tabel: `warehouses` (`20260907000007-create-warehouses.js`) & seeder 3 gudang awal (`20260907000003-seed-warehouses-and-permissions.js`)
- [x] Backend Warehouses: `Warehouse.route.js`, `Warehouse.validator.js`, `Warehouse.controller.js`, `Warehouse.service.js`, `Warehouse.repository.js`, `Warehouses.model.js`
- [x] Backend Users & Roles: `User.route.js`, `User.controller.js`, `User.service.js`, `User.repository.js`, `User.validator.js`, `Role.route.js`, `Role.controller.js`, `Role.service.js`, `Role.repository.js`, `Role.validator.js`
- [x] Frontend Modul Settings & RBAC:
  - `/settings/users` (Daftar Users, filter role/status, 4 KPI cards, modal tambah/edit user dengan role selector, dialog hapus)
  - `/settings/roles` (Daftar Roles, 4 KPI cards, modal tambah/edit role dengan checklist hak akses fitur per modul, dialog hapus)
  - `/settings/warehouses` (Daftar Warehouse, filter status, 4 KPI cards, modal tambah/edit gudang, dialog hapus)

### Phase 3 — Produk & Kategori (Status: COMPLETED / 100%)
- [x] Migrasi tabel: `product_categories` (`20260907000008`), `units` (`20260907000009`), `taxes` (`20260907000010`), `products` (`20260907000011`)
- [x] Seeder data: Satuan dasar (`PCS` & `BOX`), Pajak (`NON`, `PPN11`, `PPN12`), Kategori produk awal, dan Katalog produk awal (`20260907000004`)
- [x] Backend Controller: Model, CRUD Category (`/primary/v1/product-categories`), Unit (`/primary/v1/units`), Tax (`/primary/v1/taxes`), Product (`/primary/v1/products`) dengan relasi kategori & satuan
- [x] Frontend Modul Produk & Kategori terintegrasi API real:
  - `/products` (Daftar Produk, filter kategori & satuan PCS/BOX, 4 KPI cards, modal tambah/edit produk, export CSV, batch delete)
  - `/products/categories` (Daftar Kategori, 4 KPI cards, modal tambah/edit kategori, dialog hapus)

### Phase 4 — Inventaris dan Stok (Status: COMPLETED / 100%)
- [x] Migrasi tabel: `warehouse_stocks`, `stock_movements`, `stock_opnames`, `stock_opname_items`, `stock_wastes`
- [x] Backend Controller: Model, Repository, Validator, Service dengan Sequelize Managed Transaction, Controller, dan Routes
  - Saldo Stok per Gudang & Produk (`/primary/v1/inventory/stocks`)
  - Penyesuaian Stok & Penerimaan (`POST /primary/v1/inventory/stocks/adjustment`)
  - Sesi Stok Opname & Rekonsiliasi (`/primary/v1/inventory/opnames`)
  - Pencatatan Barang Rusak/Waste (`/primary/v1/inventory/wastes`)
  - Kartu Mutasi Stok Ledger (`/primary/v1/inventory/movements`)
- [x] Frontend Modul Inventaris dan Stok terintegrasi API riil:
  - `/inventory` (Daftar Stok Saldo Riil, 4 KPI cards, Modal Penyesuaian Stok, Export CSV, Hapus & Batch Delete)
  - `/inventory/opname` (Daftar Sesi Opname, 4 KPI cards, Modal Buat Sesi Opname, Detail Modal, Tombol Persetujuan, Export CSV)
  - `/inventory/waste` (Pencatatan Stok Rusak/Waste, 4 KPI cards, Modal Catat Barang Rusak, Tombol Persetujuan, Export CSV)

### Phase 5 — Penjualan: Penawaran & Pesanan (Status: COMPLETED / 100%)
* [x] Migrasi tabel: `quotations`, `quotation_items`, `sales_orders`, `sales_order_items`
* [x] Backend: Penomoran otomatis `QT-YYYYMM-XXX` dan `SO-YYYYMM-XXX`, Approval/Reject Quotation, Convert to Sales Order, Konfirmasi Order, Detail & Metrics
* [x] Frontend Penjualan terintegrasi API riil:
  * [x] `/quotations` (Daftar Penawaran Harga, Valid Until, Nilai Pipeline, Win Rate, Modal Buat Quotation, Pratinjau Detail, Setujui, Tolak, Konversi ke Sales Order, Hapus & Batch Delete)
  * [x] `/sales-orders` (Daftar Pesanan Penjualan, Alokasi Gudang, Status Pemenuhan, Modal Buat Sales Order, Pratinjau Detail, Konfirmasi Pesanan, Batalkan, Buat Surat Jalan, Hapus & Batch Delete)

### Phase 6 — Penjualan: Surat Jalan (Delivery & Pemotongan Stok) (Status: COMPLETED / 100%)
* [x] Migrasi tabel: `deliveries`, `delivery_items`
* [x] Backend: Alur Partial Delivery, Validasi Saldo Stok Gudang, Eksekusi Pemotongan Stok Atomik di Database Transaction & Riwayat `stock_movements` (tipe `SALES_DELIVERY`), Update Otomatis Status Sales Order (`Proses Kirim` / `Selesai Dikirim`)
* [x] Frontend Surat Jalan terintegrasi API riil:
  * [x] `/deliveries` (Daftar Pengiriman Penjualan, Armada Kurir, Status POD / Perjalanan, Modal Buat Surat Jalan, Detail Muatan, Tombol "Kirim & Potong Stok" Atomik, Tandai Diterima, Cetak Dokumen Surat Jalan, Hapus & Batch Delete)

### Phase 7 — Penjualan: Daftar Invoice (Status: COMPLETED / 100%)
* [x] Migrasi tabel: `invoices`, `invoice_items`
* [x] Backend:
  * Penomoran otomatis format `INV-YYYYMM-XXX`
  * Relasi transaksi: Invoice → Customer, Delivery Order, Sales Order, dan User Creator
  * Perhitungan tanggal jatuh tempo otomatis berdasarkan `payment_terms` customer
  * Import otomatis item produk & harga jual dari Delivery Order / Sales Order
  * Endpoint CRUD, metrik piutang/overdue, dan batch delete
* [x] Frontend terintegrasi API riil:
  * [x] `/invoices` (Daftar Faktur Komersial, 4 Kartu Metrik Piutang Riil, Filter Status, Sorting, Pencarian, Modal Penerbitan Faktur dari DO / Manual, Pratinjau Rincian Tagihan, Cetak Dokumen Faktur Komersial dengan Rekening Bank & Tanda Tangan, Export CSV, Hapus & Batch Delete)
  * [x] Tombol pintas "Terbitkan Faktur" di halaman `/deliveries`

### Phase 8 — Penjualan: Daftar Payments & Alokasi (Status: COMPLETED / 100%)
* [x] Migrasi tabel: `payments`, `payment_allocations`
* [x] Backend:
  * Penomoran otomatis format `PAY-YYYYMM-XXX`
  * Relasi transaksi: Payment → Customer, User Creator, PaymentAllocations, dan Invoices
  * Pencatatan penerimaan kas masuk, transfer perbankan, dan kliring giro
  * Alokasi fleksibel multi-invoice dengan validasi total nominal & batas sisa piutang
  * Sinkronisasi atomik status faktur (`Belum Dibayar` → `Sebagian` → `Lunas`) serta rollback otomatis saat transaksi dihapus
  * Endpoint CRUD, metrik settlement/pending/top channel, dan batch delete
* [x] Frontend terintegrasi API riil:
  * [x] `/payments` (Daftar Penerimaan Pembayaran, 4 Kartu Metrik Kas Riil, Filter Status & Metode Bayar, Sorting, Modal Input Pembayaran & Alokasi Multi-Faktur Interaktif dengan Auto-FIFO, Pratinjau Rincian Alokasi, Cetak Kuitansi Resmi dengan Format Terbilang Rupiah & Tanda Tangan Kasir, Export CSV, Hapus & Batch Delete)
  * [x] Tombol pintas "Catat Pembayaran" langsung dari halaman `/invoices`

### Phase 9 — Dashboard Analytics Realtime (Status: COMPLETED / 100%)
* [x] Endpoint agregasi metrik penjualan, piutang, rasio pelunasan, dan tren penjualan terfilter rentang tanggal (`GET /primary/v1/dashboard/metrics`, `GET /primary/v1/dashboard/sales-trend`)
* [x] Endpoint transaksi terkini riil menggabungkan Faktur dan Pembayaran terbaru (`GET /primary/v1/dashboard/recent-transactions`)
* [x] Integrasi frontend Date Range Picker interaktif, visualisasi grafik komparasi omzet vs kas masuk, dan tabel transaksi terbaru riil

### Phase 10 — Finalization & QA (Status: COMPLETED / 100%)
* [x] Audit komprehensif Role-Based Access Control (RBAC) pada seluruh 16 grup endpoint & verifikasi token guard (401 Unauthorized)
* [x] Validasi payload Ajv ketat & standarisasi ResponsePreset sukses/error
* [x] Uji coba End-to-End siklus bisnis penuh dari Login $\rightarrow$ Customer/Warehouse/Product $\rightarrow$ Stok In/Adjustment $\rightarrow$ Quotation $\rightarrow$ Sales Order $\rightarrow$ Delivery (Potong Stok & Mutasi) $\rightarrow$ Invoice $\rightarrow$ Payment (Auto Lunas) $\rightarrow$ Realtime Dashboard Analytics (100% Pass)

### Phase 11 — Pengaturan Sistem, Keamanan PIN & Kebijakan Pemesanan Stok (Status: COMPLETED / 100%)
- [x] Database: Migration tabel `system_settings` (`key`, `value`, `description`, `updated_by`) & seeder konfigurasi awal
- [x] Backend: Model Sequelize `SystemSettings.model.js`, `SystemSetting.route.js`, `SystemSetting.controller.js`, `SystemSetting.service.js`, `SystemSetting.repository.js`, `SystemSetting.validator.js`
- [x] Backend: Endpoint manajemen PIN 6 digit (`PUT /primary/v1/settings/system/pin`), verifikasi PIN (`POST /primary/v1/settings/system/verify-pin`), dan toggle Force Sales Order (`PUT /primary/v1/settings/system/force-sales-order`)
- [x] Backend (Sales Order): Pengecekan stok cerdas dengan otorisasi PIN 6 digit pada `POST /primary/v1/sales-orders` (parameter `force_override: true` dan `pin`)
- [x] Backend (Delivery): Restriksi mutlak pengiriman barang (`createDelivery` dan `confirmDelivery`), menolak jika `quantity > physical_stock` tanpa opsi bypass untuk mencegah stok minus
- [x] Frontend Modul Settings: Sub modul `/settings/system` (Pengaturan Sistem) dengan card Keamanan PIN (Toggle status PIN, modal buat/ubah 6 digit PIN) dan card Kebijakan Pesanan (Toggle Force Create Sales Order yang dilindungi PIN)
- [x] Frontend Modul Sales Order: Modal dialog otorisasi PIN 6 digit yang muncul otomatis saat pengguna menekan tombol "Buat Sales Order" namun stok produk tidak mencukupi
- [x] Frontend Modul Delivery: Tampilan info ketersediaan stok fisik riil pada dialog pembuatan Surat Jalan dan restriksi input kuantitas maksimal kirim sesuai stok fisik

---

## 19. PRIORITY MATRIX

* **P0 — Core (Wajib Selesai untuk Operasional Bisnis)**:
  * Authentication & User Management (Phase 1 — Selesai)
  * Customers & Settings Warehouse (Phase 2)
  * Produk & Kategori (Phase 3)
  * Inventaris dan Stok (Daftar Stok, Opname, Stok Terbuang) (Phase 4)
  * Penjualan: Penawaran (Quotation) & Pesanan (Sales Order) (Phase 5)
  * Penjualan: Surat Jalan (Delivery & Pemotongan Stok) (Phase 6)
  * Penjualan: Daftar Invoice (Phase 7)
  * Penjualan: Daftar Payments & Alokasi (Phase 8)

* **P1 — Supporting (Fitur Penunjang & Efisiensi)**:
  * Dashboard KPI Metrics Realtime (Phase 9 — Selesai)
  * Reporting & Data Export (PDF/Excel/CSV)
  * Role & Permission Granular Access Control
  * Document Audit Trail & Relationship Tracking

* **P2 — Future Enhancements**:
  * Multi-Warehouse Transfer (Antar Gudang)
  * Sales Return (Retur Penjualan)
  * Purchase Orders & Supplier Management
  * Integrasi Payment Gateway Otomatis
  * Integrasi Akuntansi Umum / General Ledger

---

## 20. CATATAN ARSITEKTUR KUNCI

1. **Customer ≠ Warehouse**:
   Warehouse murni merupakan lokasi fisik penyimpanan stok barang, sedangkan Customer adalah entitas pihak luar pembeli yang menerima barang dan faktur tagihan.
2. **Stok Dipotong Saat Delivery, Bukan Saat Sales Order**:
   Sales Order hanya memegang komitmen pemesanan dan tidak mengubah saldo kuantitas stok. Pengurangan stok riil gudang dan pencatatan riwayat `stock_movements` terjadi secara atomik ketika surat jalan (Delivery) dikonfirmasi. Ini memungkinkan partial delivery dan pemesanan pre-order dikelola secara akurat tanpa *ghost stock*.
3. **Hubungan Fleksibel Payment & Invoice (Many-to-Many via Allocations)**:
   Melalui tabel penghubung `payment_allocations`, satu pembayaran transfer pelanggan dapat melunasi beberapa invoice sekaligus, dan sebaliknya satu invoice berskala besar dapat dicicil melalui beberapa kali pembayaran secara transparan.
4. **Desain Database Siap Multi-Warehouse Sejak Hari Pertama**:
   Meskipun pada fase awal perusahaan hanya mengoperasikan satu warehouse utama, seluruh tabel transaksi dan relasi stok telah mengaitkan `warehouse_id`. Ketika ekspansi gudang dilakukan, struktur fundamental database tidak perlu diubah ataupun dimigrasi ulang.
5. **Pemisahan Tegas antara Force Sales Order vs Strict Delivery Restriction**:
   Sales Order adalah dokumen perikatan komersial pemesanan, sehingga dapat dipaksa terbit (backorder) via otorisasi PIN 6-digit oleh pihak berwenang ketika stok tidak cukup. Sebaliknya, Pengiriman (Delivery / Surat Jalan) adalah dokumen operasional logistik yang memotong saldo stok fisik gudang secara riil. Pengiriman **TIDAK BISA** dipaksa jika stok fisik tidak mencukupi (tidak ada bypass PIN), guna menjamin integritas inventaris agar saldo stok fisik tidak pernah bernilai negatif (mines).

---

## 21. MASTER IMPLEMENTATION TODOLIST

### 21.1 Modul Auth & Session Management (Status: SELESAI / 100%)
- [x] **Database**: Migration `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- [x] **Database**: Seeder master roles, permissions & initial superadmin user
- [x] **Controller**: Model Sequelize `Users`, `Roles`, `Permissions`, `RolePermissions`, `UserRoles`
- [x] **Controller**: `Auth.route.js`, `Auth.controller.js`, `Auth.service.js`, `User.repository.js`, `Auth.validator.js`
- [x] **Controller**: Middleware `Authorization.middleware.js` & token helpers (JWT, SHA256)
- [x] **Dashboard**: Halaman login (`login-page.tsx`), form login (`login-form.tsx`), `auth.service.ts`
- [x] **Dashboard**: Token lifecycle (TTL 3 jam, refresh aktivitas 1.5 jam, auto-redirect `/login` jika 401 expired/invalid)

### 21.2 Modul Customers (Status: SELESAI / 100%)
- [x] **Database**: Migration `customers` (`20260907000006-create-customers.js`)
- [x] **Database**: Seeder 164 data dummy customer (`20260907000002-seed-customers.js`)
- [x] **Controller**: Model Sequelize `Customers.model.js`
- [x] **Controller**: `Customer.route.js`, `Customer.controller.js`, `Customer.service.js`, `Customer.repository.js`, `Customer.validator.js` (CRUD, KPI metric, batch delete)
- [x] **Dashboard**: Halaman `/customers` (`customers-page.tsx`, `customer-dialog.tsx`, `customer.service.ts`) terintegrasi real API backend

### 21.3 Modul Settings: Users, Roles, Permissions & Warehouses (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `warehouses` (`20260907000007-create-warehouses.js`)
- [x] **Database**: Seeder master warehouse & permission baru (`20260907000003-seed-warehouses-and-permissions.js`)
- [x] **Controller**: Model Sequelize `Warehouses.model.js` & asosiasi role-permissions di `Handler.model.js`
- [x] **Controller**: CRUD Warehouse (`/primary/v1/warehouses`), KPI metrics, auto code generator `WH-001`
- [x] **Controller**: CRUD Roles & Permissions (`/primary/v1/roles`, `/primary/v1/permissions`), KPI metrics, mapping hak akses fitur
- [x] **Controller**: CRUD Users (`/primary/v1/users`), KPI metrics, password SHA256 hashing, dan penugasan multi-role
- [x] **Dashboard**: Halaman `/settings/users` (Table users, 4 KPI cards, filter role & status, modal tambah/edit user terintegrasi role selector, dialog konfirmasi hapus)
- [x] **Dashboard**: Halaman `/settings/roles` (Table roles, badge permissions & user count, 4 KPI cards, modal tambah/edit role terintegrasi checklist fitur per modul, dialog konfirmasi hapus)
- [x] **Dashboard**: Halaman `/settings/warehouses` (Table warehouses, 4 KPI cards, filter status, modal tambah/edit gudang, dialog konfirmasi hapus)
- [x] **Dashboard**: Navigasi sidebar menu Settings (`/settings/users`, `/settings/roles`, `/settings/warehouses`)

### 21.4 Modul Produk & Kategori (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `product_categories`, `units`, `taxes`, `products`
- [x] **Database**: Seeder satuan produk khusus (`PCS` & `BOX`), kategori awal, pajak (`PPN11`, `PPN12`, `NON`), dan sampel produk
- [x] **Controller**: Model Sequelize `ProductCategories`, `Units`, `Taxes`, `Products`
- [x] **Controller**: Endpoint CRUD Categories (`/primary/v1/product-categories`), metrics KPI
- [x] **Controller**: Endpoint CRUD Units (`/primary/v1/units`)
- [x] **Controller**: Endpoint CRUD Taxes (`/primary/v1/taxes`)
- [x] **Controller**: Endpoint CRUD Products (`/primary/v1/products`), metrics KPI, batch delete, relasi category & unit
- [x] **Dashboard**: Halaman `/products` (Tabel produk, filter kategori, filter satuan PCS/BOX, 4 KPI cards, modal tambah/edit produk, export CSV, batch delete)
- [x] **Dashboard**: Halaman `/products/categories` (Tabel kategori, 4 KPI cards, modal tambah/edit kategori, konfirmasi hapus)
- [x] **Dashboard**: Tipe TypeScript & service API client (`product.types.ts` & `product.service.ts`) terintegrasi real API backend

### 21.5 Modul Inventaris & Stok (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `warehouse_stocks`, `stock_movements`, `stock_opnames`, `stock_opname_items`, `stock_wastes`
- [x] **Database**: Seeder data awal inventaris, riwayat mutasi awal, contoh opname & waste (`20260907000005-seed-inventory.js`)
- [x] **Controller**: Model Sequelize `WarehouseStocks`, `StockMovements`, `StockOpnames`, `StockOpnameItems`, `StockWastes` & relasi di `Handler.model.js`
- [x] **Controller**: Endpoint Saldo Stok per gudang (`GET /primary/v1/inventory/stocks`) & 4 KPI metrics (`GET /primary/v1/inventory/stocks/metrics`)
- [x] **Controller**: Endpoint Penyesuaian / Penerimaan Stok (`POST /primary/v1/inventory/stocks/adjustment`) & Batch Delete
- [x] **Controller**: Endpoint Stock Opname (`GET /primary/v1/inventory/opnames`, `POST`, `GET /:id`, `POST /:id/approve`)
- [x] **Controller**: Endpoint Stock Waste (`GET /primary/v1/inventory/wastes`, `POST`, `POST /:id/approve`)
- [x] **Controller**: Endpoint Stock Movements Ledger (`GET /primary/v1/inventory/movements`)
- [x] **Dashboard (UI)**: Halaman `/inventory` (Daftar stok per gudang, status minimum, valuasi, 4 KPI, Export CSV, Hapus item)
- [x] **Dashboard (UI)**: Halaman `/inventory/opname` (Sesi rekonsiliasi opname, selisih stok, 4 KPI, Detail item, Tombol persetujuan, Export CSV)
- [x] **Dashboard (UI)**: Halaman `/inventory/waste` (Pencatatan barang rusak/terbuang, estimasi rugi, 4 KPI, Tombol persetujuan, Export CSV)
- [x] **Dashboard (Integration)**: Dialog modal Stock Adjustment, Form Opname, Form Waste + tipe TypeScript & service API client riil

### 21.6 Modul Penjualan: Penawaran (Quotation) & Pesanan (Sales Order) (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `quotations`, `quotation_items`, `sales_orders`, `sales_order_items`
- [x] **Controller**: Model Sequelize `Quotations`, `QuotationItems`, `SalesOrders`, `SalesOrderItems`
- [x] **Controller**: Endpoint Quotation CRUD, Approve, Reject, dan Convert to Sales Order (`QT-YYYY-XXXXXX`)
- [x] **Controller**: Endpoint Sales Order CRUD, Confirm, Kalkulasi Subtotal/Diskon/PPN/Grand Total (`SO-YYYY-XXXXXX`)
- [x] **Dashboard (UI)**: Halaman `/quotations` (Daftar penawaran, nilai pipeline, win rate, 4 KPI)
- [x] **Dashboard (UI)**: Halaman `/sales-orders` (Daftar pesanan penjualan, status pemenuhan, 4 KPI)
- [x] **Dashboard (Integration)**: Form transaksi Quotation, tombol aksi Approve/Convert, Form Sales Order + koneksi API real

### 21.7 Modul Penjualan: Surat Jalan (Delivery) & Pemotongan Stok (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `deliveries`, `delivery_items`
- [x] **Controller**: Model Sequelize `Deliveries`, `DeliveryItems`
- [x] **Controller**: Endpoint Delivery CRUD (`DO-YYYY-XXXXXX`)
- [x] **Controller**: Endpoint Delivery Confirm (`POST /primary/v1/deliveries/:id/confirm`) dengan transaksi atomik pemotongan `warehouse_stocks` & insert `stock_movements` (type `SALES_DELIVERY`)
- [x] **Dashboard (UI)**: Halaman `/deliveries` (Daftar pengiriman, ekspedisi/kurir, status POD, 4 KPI)
- [x] **Dashboard (Integration)**: Modal buat Surat Jalan dari Sales Order, tombol Konfirmasi Pengiriman + koneksi API real

### 21.8 Modul Penjualan: Faktur Penjualan (Invoice) (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `invoices`, `invoice_items`
- [x] **Controller**: Model Sequelize `Invoices`, `InvoiceItems`
- [x] **Controller**: Endpoint Invoice CRUD (`INV-YYYY-XXXXXX`) dibuat dari 1 atau beberapa Delivery terkonfirmasi
- [x] **Controller**: Endpoint Invoice Cancel & kalkulasi jatuh tempo
- [x] **Dashboard (UI)**: Halaman `/invoices` (Daftar faktur, sisa tagihan, status overdue/unpaid, 4 KPI)
- [x] **Dashboard (Integration)**: Modal buat Invoice dari Delivery, cetak PDF invoice + koneksi API real

### 21.9 Modul Penjualan: Pembayaran (Payment Receipt & Allocation) (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `payments`, `payment_allocations`
- [x] **Controller**: Model Sequelize `Payments`, `PaymentAllocations`
- [x] **Controller**: Endpoint Payment CRUD (`PAY-YYYY-XXXXXX`)
- [x] **Controller**: Endpoint Alokasi Pembayaran Multi-Invoice (`POST /primary/v1/payments/:id/allocate`) & auto update status Invoice (`PARTIALLY_PAID` / `PAID`)
- [x] **Dashboard (UI)**: Halaman `/payments` (Daftar pembayaran, metode transfer/kas, status settlement, 4 KPI)
- [x] **Dashboard (Integration)**: Modal input penerimaan pembayaran & form alokasi invoice + koneksi API real

### 21.10 Modul Dashboard Overview & Realtime Analytics (Status: SELESAI / 100%)
- [x] **Controller**: Endpoint metrik ringkasan KPI penjualan & transaksi (`GET /primary/v1/dashboard/metrics?start_date=...&end_date=...`)
- [x] **Controller**: Endpoint 5 transaksi penjualan terkini gabungan Faktur & Pembayaran (`GET /primary/v1/dashboard/recent-transactions`)
- [x] **Controller**: Endpoint grafik tren penjualan dan koleksi kas harian (`GET /primary/v1/dashboard/sales-trend`)
- [x] **Dashboard (UI)**: Layout overview 4 KPI card, Date Range Picker interaktif, chart tren komparasi penjualan vs kas tertagih, recent transactions table
- [x] **Dashboard (Integration)**: Koneksi Date Range Picker ke API endpoint dashboard metrics, sales trend & recent transactions real-time

### 21.11 Finalization, Audit RBAC & Full End-to-End QA (Status: SELESAI / 100%)
- [x] **Audit Keamanan & RBAC**: Verifikasi seluruh 16 grup route terproteksi dengan middleware `Authorization.check()`, pengujian token kosong/invalid mengembalikan HTTP 401 Unauthorized
- [x] **Validasi Payload & Format Respon**: Standarisasi skema Ajv validator dan konsistensi struktur `ResponsePresetHelper`
- [x] **Automated E2E QA Test Script**: Eksekusi siklus ERP penuh tanpa celah (Login $\rightarrow$ Customer $\rightarrow$ Warehouse $\rightarrow$ Product $\rightarrow$ Stock Adjustment $\rightarrow$ Quotation Buat/Setujui/Konversi $\rightarrow$ Sales Order Konfirmasi $\rightarrow$ Surat Jalan Buat/Kirim Potong Stok Atomik/Diterima $\rightarrow$ Faktur Penjualan Terbit $\rightarrow$ Pembayaran Kas/Bank Alokasi Multi-Faktur $\rightarrow$ Auto-Pelunasan Faktur $\rightarrow$ Realtime Dashboard Metrics/Transactions/Trend) lolos 100%



### 21.12 Modul Pengaturan Sistem (PIN Security & Force Sales Order) & Strict Delivery Restrict (Status: SELESAI / 100%)
- [x] **Database**: Migration tabel `system_settings` (`key`, `value`, `description`, `updated_by`) & seeder konfigurasi awal
- [x] **Database**: Seeder default config (`security_pin_enabled: false`, `force_sales_order_enabled: false`)
- [x] **Controller**: Model Sequelize `SystemSettings.model.js` & integrasi relasi di `Handler.model.js`
- [x] **Controller**: Route `SystemSetting.route.js`, controller `SystemSetting.controller.js`, service `SystemSetting.service.js`, repository `SystemSetting.repository.js`, validator Ajv `SystemSetting.validator.js`
- [x] **Controller**: Endpoint `GET /primary/v1/settings/system`, `PUT /primary/v1/settings/system/pin`, `PUT /primary/v1/settings/system/force-sales-order`, `POST /primary/v1/settings/system/verify-pin`
- [x] **Controller (Sales Order)**: Validasi stok pada `SalesOrder.service.js` dengan dukungan `force_override: true` dan verifikasi hash PIN otorisasi
- [x] **Controller (Delivery)**: Validasi mutlak pada `Delivery.service.js` (`createDelivery` & `confirmDelivery`) memblokir pengiriman jika kuantitas kirim > stok fisik riil
- [x] **Dashboard (UI Settings)**: Halaman Pengaturan Sistem `/settings/system` dengan kartu Keamanan PIN (Toggle + Modal Setup PIN 6 Digit) dan kartu Kebijakan Penjualan (Toggle Force Create SO dengan konfirmasi PIN)
- [x] **Dashboard (UI Sales Order)**: Modal Otorisasi PIN 6 Digit pada formulir Sales Order saat produk yang dipilih melebihi stok yang tersedia
- [x] **Dashboard (UI Delivery)**: Tampilan info stok fisik riil di dialog pembuatan Surat Jalan dan pembatasan maksimal input kuantitas kirim sesuai stok fisik yang tersedia
- [x] **Dashboard (Sidebar & Routing)**: Penambahan menu "Pengaturan Sistem" pada sidebar menu Settings dan route `/settings/system` di `App.tsx`
