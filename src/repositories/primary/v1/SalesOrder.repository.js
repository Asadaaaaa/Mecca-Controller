import { Op } from "sequelize";

class SalesOrderRepository {
    constructor(server) {
        this.server = server;
    }

    get salesOrderTable() {
        return this.server.model?.salesOrders?.table;
    }

    get salesOrderItemTable() {
        return this.server.model?.salesOrderItems?.table;
    }

    get customerTable() {
        return this.server.model?.customers?.table;
    }

    get quotationTable() {
        return this.server.model?.quotations?.table;
    }

    get warehouseTable() {
        return this.server.model?.warehouses?.table;
    }

    get productTable() {
        return this.server.model?.products?.table;
    }

    get userTable() {
        return this.server.model?.users?.table;
    }

    get deliveryTable() {
        return this.server.model?.deliveries?.table;
    }

    async findSalesOrders({ search = '', status = '', warehouse_id = '', sort = 'order_date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.salesOrderTable) return { count: 0, rows: [] };

        const where = {};

        if (status && status !== 'Semua') {
            where.status = status;
        }

        if (warehouse_id && warehouse_id !== '') {
            where.warehouse_id = warehouse_id;
        }

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { sales_order_number: { [Op.like]: query } },
                { '$customer.name$': { [Op.like]: query } }
            ];
        }

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const actualLimit = parseInt(limit, 10);

        const sortFieldMap = {
            'id': 'id',
            'date': 'order_date',
            'order_date': 'order_date',
            'orderNo': 'sales_order_number',
            'sales_order_number': 'sales_order_number',
            'totalAmount': 'grand_total',
            'grand_total': 'grand_total',
            'subtotal': 'subtotal',
            'status': 'status',
            'created_at': 'created_at',
            'updated_at': 'updated_at'
        };
        const actualSort = sortFieldMap[sort] || 'order_date';
        const actualOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        return await this.salesOrderTable.findAndCountAll({
            where,
            include: [
                {
                    model: this.customerTable,
                    as: 'customer',
                    attributes: ['id', 'code', 'name', 'phone', 'email', 'address']
                },
                {
                    model: this.quotationTable,
                    as: 'quotation',
                    attributes: ['id', 'quotation_number']
                },
                {
                    model: this.warehouseTable,
                    as: 'warehouse',
                    attributes: ['id', 'code', 'name']
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.salesOrderItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product',
                            attributes: ['id', 'code', 'name', 'selling_price']
                        }
                    ]
                }
            ],
            order: [[actualSort, actualOrder]],
            offset,
            limit: actualLimit,
            distinct: true
        });
    }

    async findSalesOrderById(id, transaction = null) {
        if (!this.salesOrderTable) return null;
        return await this.salesOrderTable.findByPk(id, {
            include: [
                {
                    model: this.customerTable,
                    as: 'customer'
                },
                {
                    model: this.quotationTable,
                    as: 'quotation'
                },
                {
                    model: this.warehouseTable,
                    as: 'warehouse'
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.salesOrderItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product'
                        }
                    ]
                },
                {
                    model: this.deliveryTable,
                    as: 'deliveries'
                }
            ],
            transaction
        });
    }

    async findSalesOrderByNumber(sales_order_number, transaction = null) {
        if (!this.salesOrderTable) return null;
        return await this.salesOrderTable.findOne({
            where: { sales_order_number },
            transaction
        });
    }

    async createSalesOrder(data, transaction = null) {
        if (!this.salesOrderTable) return null;
        return await this.salesOrderTable.create(data, { transaction });
    }

    async createSalesOrderItems(items, transaction = null) {
        if (!this.salesOrderItemTable) return [];
        return await this.salesOrderItemTable.bulkCreate(items, { transaction });
    }

    async updateSalesOrder(id, data, transaction = null) {
        if (!this.salesOrderTable) return null;
        const salesOrder = await this.salesOrderTable.findByPk(id, { transaction });
        if (!salesOrder) return null;
        return await salesOrder.update(data, { transaction });
    }

    async updateSalesOrderItemDeliveredQty(id, delivered_quantity, transaction = null) {
        if (!this.salesOrderItemTable) return null;
        const item = await this.salesOrderItemTable.findByPk(id, { transaction });
        if (!item) return null;
        return await item.update({ delivered_quantity }, { transaction });
    }

    async deleteSalesOrder(id, transaction = null) {
        if (!this.salesOrderTable) return 0;
        return await this.salesOrderTable.destroy({
            where: { id },
            transaction
        });
    }

    async batchDeleteSalesOrders(ids, transaction = null) {
        if (!this.salesOrderTable) return 0;
        return await this.salesOrderTable.destroy({
            where: { id: { [Op.in]: ids } },
            transaction
        });
    }

    async getSalesOrderMetrics() {
        if (!this.salesOrderTable) {
            return {
                totalOrders: 0,
                completedDeliveries: 0,
                inDeliveryProcess: 0,
                readyToShip: 0,
                totalAmount: 0
            };
        }

        const totalOrders = await this.salesOrderTable.count();
        const completedDeliveries = await this.salesOrderTable.count({
            where: {
                status: { [Op.in]: ['Selesai Dikirim', 'FULLY_DELIVERED'] }
            }
        });
        const inDeliveryProcess = await this.salesOrderTable.count({
            where: {
                status: { [Op.in]: ['Proses Kirim', 'PARTIALLY_DELIVERED'] }
            }
        });
        const readyToShip = await this.salesOrderTable.count({
            where: {
                status: { [Op.in]: ['Siap Kirim', 'CONFIRMED'] }
            }
        });

        const activeOrders = await this.salesOrderTable.findAll({
            attributes: ['grand_total']
        });

        const totalAmount = activeOrders.reduce((sum, o) => sum + (parseFloat(o.grand_total) || 0), 0);

        return {
            totalOrders,
            completedDeliveries,
            inDeliveryProcess,
            readyToShip,
            totalAmount
        };
    }

    async getAvailableStock(warehouse_id, product_id, excludeSalesOrderId = null, transaction = null) {
        const pId = parseInt(product_id, 10);
        const wId = parseInt(warehouse_id, 10);

        // 1. Get physical on-hand stock
        let physicalStock = 0;
        const stockTable = this.server.model?.warehouseStocks?.table;
        if (stockTable) {
            const stockRecord = await stockTable.findOne({
                where: { warehouse_id: wId, product_id: pId },
                transaction
            });
            if (stockRecord) {
                physicalStock = parseFloat(stockRecord.quantity) || 0;
            }
        }

        // 2. Calculate reserved stock from all active unfulfilled Sales Orders in this warehouse
        let reservedStock = 0;
        const soTable = this.salesOrderTable;
        const soItemTable = this.salesOrderItemTable;

        if (soTable && soItemTable) {
            const soWhere = {
                warehouse_id: wId,
                status: {
                    [Op.notIn]: ['Selesai', 'Selesai Dikirim', 'Dibatalkan', 'CANCELLED', 'FULLY_DELIVERED']
                }
            };
            if (excludeSalesOrderId) {
                soWhere.id = { [Op.ne]: excludeSalesOrderId };
            }

            const activeOrders = await soTable.findAll({
                where: soWhere,
                include: [
                    {
                        model: soItemTable,
                        as: 'items',
                        where: { product_id: pId },
                        required: true
                    }
                ],
                transaction
            });

            for (const order of activeOrders) {
                if (order.items) {
                    for (const item of order.items) {
                        const ordered = parseFloat(item.quantity) || 0;
                        const delivered = parseFloat(item.delivered_quantity) || 0;
                        const remaining = Math.max(0, ordered - delivered);
                        reservedStock += remaining;
                    }
                }
            }
        }

        const availableStock = Math.max(0, physicalStock - reservedStock);

        return {
            warehouse_id: wId,
            product_id: pId,
            physicalStock,
            reservedStock,
            availableStock
        };
    }
}

export default SalesOrderRepository;
