// Library
import { Sequelize } from "sequelize";
import UsersModel from "./Users.model.js";
import RolesModel from "./Roles.model.js";
import PermissionsModel from "./Permissions.model.js";
import UserRolesModel from "./UserRoles.model.js";
import RolePermissionsModel from "./RolePermissions.model.js";
import CustomersModel from "./Customers.model.js";
import WarehousesModel from "./Warehouses.model.js";
import ProductCategoriesModel from "./ProductCategories.model.js";
import UnitsModel from "./Units.model.js";
import TaxesModel from "./Taxes.model.js";
import ProductsModel from "./Products.model.js";
import WarehouseStocksModel from "./WarehouseStocks.model.js";
import StockMovementsModel from "./StockMovements.model.js";
import StockOpnamesModel from "./StockOpnames.model.js";
import StockOpnameItemsModel from "./StockOpnameItems.model.js";
import StockWastesModel from "./StockWastes.model.js";
import QuotationsModel from "./Quotations.model.js";
import QuotationItemsModel from "./QuotationItems.model.js";
import SalesOrdersModel from "./SalesOrders.model.js";
import SalesOrderItemsModel from "./SalesOrderItems.model.js";
import DeliveriesModel from "./Deliveries.model.js";
import DeliveryItemsModel from "./DeliveryItems.model.js";
import InvoicesModel from "./Invoices.model.js";
import InvoiceItemsModel from "./InvoiceItems.model.js";
import PaymentsModel from "./Payments.model.js";
import PaymentAllocationsModel from "./PaymentAllocations.model.js";
import SystemSettingsModel from "./SystemSettings.model.js";

class Handler {
    constructor(server) {
        this.server = server;
    }

    async connect() {
        this.server.sendLogs('Connecting to database...');
        try {
            this.db = new Sequelize({
                host: this.server.env.DB_HOST,
                port: this.server.env.DB_PORT,
                username: this.server.env.DB_USERNAME,
                password: this.server.env.DB_PASSWORD,
                database: this.server.env.DB_DATABASE,
                dialect: this.server.env.DB_DIALECT,
                logging: this.server.env.DB_LOGGING === 'true' ? (sql, queryObject) => {
                    this.server.sendLogs('Query: ' + sql);
                } : false
            });
            await this.db.authenticate();
        } catch (err) {
            this.server.sendLogs(err);
            return -1;
        }

        this.server.sendLogs(`Database "${this.db.config.database}" Connected`);

        // Initialize Models
        this.users = new UsersModel(this.server, this.db);
        this.roles = new RolesModel(this.server, this.db);
        this.permissions = new PermissionsModel(this.server, this.db);
        this.userRoles = new UserRolesModel(this.server, this.db);
        this.rolePermissions = new RolePermissionsModel(this.server, this.db);
        this.customers = new CustomersModel(this.server, this.db);
        this.warehouses = new WarehousesModel(this.server, this.db);
        this.productCategories = new ProductCategoriesModel(this.server, this.db);
        this.units = new UnitsModel(this.server, this.db);
        this.taxes = new TaxesModel(this.server, this.db);
        this.products = new ProductsModel(this.server, this.db);
        this.warehouseStocks = new WarehouseStocksModel(this.server, this.db);
        this.stockMovements = new StockMovementsModel(this.server, this.db);
        this.stockOpnames = new StockOpnamesModel(this.server, this.db);
        this.stockOpnameItems = new StockOpnameItemsModel(this.server, this.db);
        this.stockWastes = new StockWastesModel(this.server, this.db);
        this.quotations = new QuotationsModel(this.server, this.db);
        this.quotationItems = new QuotationItemsModel(this.server, this.db);
        this.salesOrders = new SalesOrdersModel(this.server, this.db);
        this.salesOrderItems = new SalesOrderItemsModel(this.server, this.db);
        this.deliveries = new DeliveriesModel(this.server, this.db);
        this.deliveryItems = new DeliveryItemsModel(this.server, this.db);
        this.invoices = new InvoicesModel(this.server, this.db);
        this.invoiceItems = new InvoiceItemsModel(this.server, this.db);
        this.payments = new PaymentsModel(this.server, this.db);
        this.paymentAllocations = new PaymentAllocationsModel(this.server, this.db);
        this.systemSettings = new SystemSettingsModel(this.server, this.db);

        // Associations
        this.users.table.belongsToMany(this.roles.table, {
            through: this.userRoles.table,
            foreignKey: 'user_id',
            otherKey: 'role_id',
            as: 'roles'
        });
        this.roles.table.belongsToMany(this.users.table, {
            through: this.userRoles.table,
            foreignKey: 'role_id',
            otherKey: 'user_id',
            as: 'users'
        });

        this.roles.table.belongsToMany(this.permissions.table, {
            through: this.rolePermissions.table,
            foreignKey: 'role_id',
            otherKey: 'permission_id',
            as: 'permissions'
        });
        this.permissions.table.belongsToMany(this.roles.table, {
            through: this.rolePermissions.table,
            foreignKey: 'permission_id',
            otherKey: 'role_id',
            as: 'roles'
        });

        // Product Module Associations
        this.products.table.belongsTo(this.productCategories.table, {
            foreignKey: 'category_id',
            as: 'category'
        });
        this.productCategories.table.hasMany(this.products.table, {
            foreignKey: 'category_id',
            as: 'products'
        });

        this.products.table.belongsTo(this.units.table, {
            foreignKey: 'unit_id',
            as: 'unit'
        });
        this.units.table.hasMany(this.products.table, {
            foreignKey: 'unit_id',
            as: 'products'
        });

        this.products.table.belongsTo(this.taxes.table, {
            foreignKey: 'tax_id',
            as: 'tax'
        });
        this.taxes.table.hasMany(this.products.table, {
            foreignKey: 'tax_id',
            as: 'products'
        });

        // Inventory Module Associations
        this.warehouseStocks.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.warehouses.table.hasMany(this.warehouseStocks.table, {
            foreignKey: 'warehouse_id',
            as: 'stocks'
        });

        this.warehouseStocks.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });
        this.products.table.hasMany(this.warehouseStocks.table, {
            foreignKey: 'product_id',
            as: 'stocks'
        });

        this.stockMovements.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.stockMovements.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });
        this.stockMovements.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });

        this.stockOpnames.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.stockOpnames.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.stockOpnames.table.hasMany(this.stockOpnameItems.table, {
            foreignKey: 'stock_opname_id',
            as: 'items'
        });

        this.stockOpnameItems.table.belongsTo(this.stockOpnames.table, {
            foreignKey: 'stock_opname_id',
            as: 'opname'
        });
        this.stockOpnameItems.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });

        this.stockWastes.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.stockWastes.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });
        this.stockWastes.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });

        // Quotation Associations
        this.quotations.table.belongsTo(this.customers.table, {
            foreignKey: 'customer_id',
            as: 'customer'
        });
        this.quotations.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.quotations.table.hasMany(this.quotationItems.table, {
            foreignKey: 'quotation_id',
            as: 'items'
        });
        this.quotationItems.table.belongsTo(this.quotations.table, {
            foreignKey: 'quotation_id',
            as: 'quotation'
        });
        this.quotationItems.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });

        // Sales Order Associations
        this.salesOrders.table.belongsTo(this.customers.table, {
            foreignKey: 'customer_id',
            as: 'customer'
        });
        this.salesOrders.table.belongsTo(this.quotations.table, {
            foreignKey: 'quotation_id',
            as: 'quotation'
        });
        this.salesOrders.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.salesOrders.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.salesOrders.table.hasMany(this.salesOrderItems.table, {
            foreignKey: 'sales_order_id',
            as: 'items'
        });
        this.salesOrders.table.hasMany(this.deliveries.table, {
            foreignKey: 'sales_order_id',
            as: 'deliveries'
        });
        this.salesOrderItems.table.belongsTo(this.salesOrders.table, {
            foreignKey: 'sales_order_id',
            as: 'salesOrder'
        });
        this.salesOrderItems.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });
        this.salesOrderItems.table.hasMany(this.deliveryItems.table, {
            foreignKey: 'sales_order_item_id',
            as: 'deliveryItems'
        });

        // Delivery Associations
        this.deliveries.table.belongsTo(this.salesOrders.table, {
            foreignKey: 'sales_order_id',
            as: 'salesOrder'
        });
        this.deliveries.table.belongsTo(this.warehouses.table, {
            foreignKey: 'warehouse_id',
            as: 'warehouse'
        });
        this.deliveries.table.belongsTo(this.customers.table, {
            foreignKey: 'customer_id',
            as: 'customer'
        });
        this.deliveries.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.deliveries.table.hasMany(this.deliveryItems.table, {
            foreignKey: 'delivery_id',
            as: 'items'
        });
        this.deliveryItems.table.belongsTo(this.deliveries.table, {
            foreignKey: 'delivery_id',
            as: 'delivery'
        });
        this.deliveryItems.table.belongsTo(this.salesOrderItems.table, {
            foreignKey: 'sales_order_item_id',
            as: 'salesOrderItem'
        });
        this.deliveryItems.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });

        // Invoice Associations
        this.invoices.table.belongsTo(this.customers.table, {
            foreignKey: 'customer_id',
            as: 'customer'
        });
        this.invoices.table.belongsTo(this.deliveries.table, {
            foreignKey: 'delivery_id',
            as: 'delivery'
        });
        this.invoices.table.belongsTo(this.salesOrders.table, {
            foreignKey: 'sales_order_id',
            as: 'salesOrder'
        });
        this.invoices.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.invoices.table.hasMany(this.invoiceItems.table, {
            foreignKey: 'invoice_id',
            as: 'items'
        });
        this.invoiceItems.table.belongsTo(this.invoices.table, {
            foreignKey: 'invoice_id',
            as: 'invoice'
        });
        this.invoiceItems.table.belongsTo(this.deliveries.table, {
            foreignKey: 'delivery_id',
            as: 'delivery'
        });
        this.invoiceItems.table.belongsTo(this.products.table, {
            foreignKey: 'product_id',
            as: 'product'
        });

        // Payment Associations
        this.payments.table.belongsTo(this.customers.table, {
            foreignKey: 'customer_id',
            as: 'customer'
        });
        this.payments.table.belongsTo(this.users.table, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        this.payments.table.hasMany(this.paymentAllocations.table, {
            foreignKey: 'payment_id',
            as: 'allocations'
        });
        this.paymentAllocations.table.belongsTo(this.payments.table, {
            foreignKey: 'payment_id',
            as: 'payment'
        });
        this.paymentAllocations.table.belongsTo(this.invoices.table, {
            foreignKey: 'invoice_id',
            as: 'invoice'
        });
        this.invoices.table.hasMany(this.paymentAllocations.table, {
            foreignKey: 'invoice_id',
            as: 'allocations'
        });

        this.systemSettings.table.belongsTo(this.users.table, {
            foreignKey: 'updated_by',
            as: 'updater'
        });

        return this.db;
    }
}

export default Handler;
