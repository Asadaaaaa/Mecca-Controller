import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { Sequelize } from 'sequelize';

function hashPassword(password, salt = 'meccaSalt2026') {
  return crypto.createHash('sha256').update(password + (salt ? '-' + salt : '')).digest('hex');
}

async function resetDatabase() {
  console.log('\n========================================');
  console.log('   [Mecca ERP] Resetting Database...    ');
  console.log('========================================\n');

  const sequelize = new Sequelize(
    process.env.DB_DATABASE || 'db_mecca_staging',
    process.env.DB_USERNAME || 'mecca',
    process.env.DB_PASSWORD || 'meccaPassword123!',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('[ResetDB] Connected to database successfully.');

    // 1. Disable Foreign Key Checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Truncate all transaction tables
    console.log('[ResetDB] Truncating transaction tables...');
    const transactionTables = [
      'payment_allocations',
      'payments',
      'invoice_items',
      'invoices',
      'delivery_items',
      'deliveries',
      'sales_order_items',
      'sales_orders',
      'quotation_items',
      'quotations',
      'stock_wastes',
      'stock_opname_items',
      'stock_opnames',
      'stock_movements'
    ];

    for (const table of transactionTables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    // 3. Clean up customers (keep only 1 customer)
    console.log('[ResetDB] Keeping only 1 customer...');
    await sequelize.query('DELETE FROM `customers` WHERE `id` > 1;');
    const [existingCust] = await sequelize.query('SELECT id FROM `customers` WHERE `id` = 1;');
    const now = new Date();
    if (existingCust.length === 0) {
      await sequelize.query(
        'INSERT INTO `customers` (`id`, `code`, `name`, `pic_name`, `phone`, `email`, `address`, `created_at`, `updated_at`) VALUES (1, "CUST-2026-000001", "PT Lorem Ipsum", "Budi Santoso", "+6281234567890", "contact@loremipsum.com", "Jl. Jenderal Sudirman No. 101, Jakarta Pusat", ?, ?);',
        { replacements: [now, now] }
      );
    }

    // 4. Clean up products (keep only 1 product)
    console.log('[ResetDB] Keeping only 1 product...');
    await sequelize.query('DELETE FROM `products` WHERE `id` > 1;');
    const [existingProd] = await sequelize.query('SELECT id FROM `products` WHERE `id` = 1;');
    if (existingProd.length === 0) {
      await sequelize.query(
        'INSERT INTO `products` (`id`, `code`, `name`, `category_id`, `unit_id`, `selling_price`, `tax_id`, `status`, `created_at`, `updated_at`) VALUES (1, "PRD-001", "Barcode Scanner Wireless 2D", 1, 1, 850000.00, 1, "active", ?, ?);',
        { replacements: [now, now] }
      );
    }

    // 5. Clean up warehouse_stocks (keep only stock for product 1)
    console.log('[ResetDB] Setting warehouse stocks for product 1...');
    await sequelize.query('DELETE FROM `warehouse_stocks` WHERE `product_id` != 1 OR `warehouse_id` != 1;');
    const [existingStock] = await sequelize.query('SELECT id FROM `warehouse_stocks` WHERE `product_id` = 1 AND `warehouse_id` = 1;');
    if (existingStock.length === 0) {
      await sequelize.query(
        'INSERT INTO `warehouse_stocks` (`warehouse_id`, `product_id`, `quantity`, `min_stock`, `created_at`, `updated_at`) VALUES (1, 1, 100.00, 10.00, ?, ?);',
        { replacements: [now, now] }
      );
    } else {
      await sequelize.query(
        'UPDATE `warehouse_stocks` SET `quantity` = 100.00, `min_stock` = 10.00, `updated_at` = ? WHERE `product_id` = 1 AND `warehouse_id` = 1;',
        { replacements: [now] }
      );
    }

    // 6. Ensure Warehouses exist
    console.log('[ResetDB] Verifying warehouses...');
    const [existingWh] = await sequelize.query('SELECT count(*) as cnt FROM `warehouses`;');
    if (existingWh[0].cnt === 0) {
      await sequelize.query(
        'INSERT INTO `warehouses` (`id`, `code`, `name`, `address`, `pic_name`, `status`, `created_at`, `updated_at`) VALUES ' +
        '(1, "WH-001", "Gudang Utama Jakarta", "Jl. Pergudangan Marunda No. 88, Cilincing, Jakarta Utara", "Budi Santoso", "active", ?, ?), ' +
        '(2, "WH-002", "Gudang Transit Surabaya", "Kawasan Industri Rungkut Blok B-4, Surabaya", "Joko Susilo", "active", ?, ?), ' +
        '(3, "WH-003", "Gudang Logistik Bandung", "Jl. Soekarno Hatta No. 450, Bandung", "Asep Sunandar", "active", ?, ?);',
        { replacements: [now, now, now, now, now, now] }
      );
    }

    // 7. Ensure Admin User & Permissions
    console.log('[ResetDB] Verifying admin user & permissions...');
    await sequelize.query('DELETE FROM `users` WHERE `id` > 1;');
    await sequelize.query('DELETE FROM `user_roles` WHERE `user_id` > 1;');

    const [adminUser] = await sequelize.query('SELECT id FROM `users` WHERE `id` = 1;');
    const passHash = hashPassword('admin123', process.env.HASH_SALT_PASSWORD || 'meccaSalt2026');
    if (adminUser.length === 0) {
      await sequelize.query(
        'INSERT INTO `users` (`id`, `uuid`, `name`, `email`, `username`, `password`, `status`, `created_at`, `updated_at`) VALUES (1, "a0000000-0000-0000-0000-000000000001", "Administrator", "admin@mecca.co.id", "admin", ?, "active", ?, ?);',
        { replacements: [passHash, now, now] }
      );
    } else {
      await sequelize.query(
        'UPDATE `users` SET `email` = "admin@mecca.co.id", `username` = "admin", `password` = ?, `status` = "active", `updated_at` = ? WHERE `id` = 1;',
        { replacements: [passHash, now] }
      );
    }

    const [adminRole] = await sequelize.query('SELECT id FROM `user_roles` WHERE `user_id` = 1 AND `role_id` = 1;');
    if (adminRole.length === 0) {
      await sequelize.query(
        'INSERT INTO `user_roles` (`user_id`, `role_id`, `created_at`, `updated_at`) VALUES (1, 1, ?, ?);',
        { replacements: [now, now] }
      );
    }

    // 8. Reset System Settings to default
    console.log('[ResetDB] Resetting system settings to default...');
    await sequelize.query('TRUNCATE TABLE `system_settings`;');
    await sequelize.query(
      'INSERT INTO `system_settings` (`id`, `key`, `value`, `description`, `created_at`, `updated_at`) VALUES ' +
      '(1, "security_pin_enabled", "false", "Status aktifasi keamanan PIN otorisasi transaksi", ?, ?), ' +
      '(2, "security_pin_hash", NULL, "Hash SHA-256 dari 6 digit PIN otorisasi", ?, ?), ' +
      '(3, "force_sales_order_enabled", "false", "Izinkan paksa buat Sales Order walau stok kurang dengan otorisasi PIN", ?, ?);',
      { replacements: [now, now, now, now, now, now] }
    );

    // 9. Re-enable Foreign Key Checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n======================================================');
    console.log('  [SUCCESS] Database Reset Completed Successfully!    ');
    console.log('  - Admin Account: admin / admin@mecca.co.id (admin123)');
    console.log('  - Warehouses: Kept (3 Gudang)                       ');
    console.log('  - Permissions & Roles: Kept                         ');
    console.log('  - Customers: Exactly 1 Customer (PT Lorem Ipsum)    ');
    console.log('  - Products: Exactly 1 Product (PRD-001)             ');
    console.log('  - Warehouse Stocks: 100 Unit for PRD-001 in WH-001  ');
    console.log('  - All Transactions: Cleared (0 Quotations, 0 SO,   ');
    console.log('    0 DO, 0 Invoices, 0 Payments, 0 Opname, 0 Waste)  ');
    console.log('  - System Settings: Default (PIN disabled)           ');
    console.log('======================================================\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[ResetDB Error]:', error);
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } catch (_) {}
    await sequelize.close();
    process.exit(1);
  }
}

resetDatabase();
