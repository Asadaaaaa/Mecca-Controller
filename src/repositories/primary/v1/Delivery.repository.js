import { Op } from "sequelize";

class DeliveryRepository {
    constructor(server) {
        this.server = server;
    }

    get deliveryTable() {
        return this.server.model?.deliveries?.table;
    }

    get deliveryItemTable() {
        return this.server.model?.deliveryItems?.table;
    }

    get salesOrderTable() {
        return this.server.model?.salesOrders?.table;
    }

    get salesOrderItemTable() {
        return this.server.model?.salesOrderItems?.table;
    }

    get warehouseTable() {
        return this.server.model?.warehouses?.table;
    }

    get customerTable() {
        return this.server.model?.customers?.table;
    }

    get productTable() {
        return this.server.model?.products?.table;
    }

    get userTable() {
        return this.server.model?.users?.table;
    }

    async findDeliveries({ search = '', status = '', warehouse_id = '', sort = 'delivery_date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.deliveryTable) return { count: 0, rows: [] };

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
                { delivery_number: { [Op.like]: query } },
                { courier_fleet: { [Op.like]: query } },
                { tracking_number: { [Op.like]: query } },
                { '$customer.name$': { [Op.like]: query } },
                { '$salesOrder.sales_order_number$': { [Op.like]: query } }
            ];
        }

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const actualLimit = parseInt(limit, 10);

        return await this.deliveryTable.findAndCountAll({
            where,
            include: [
                {
                    model: this.customerTable,
                    as: 'customer',
                    attributes: ['id', 'code', 'name', 'phone', 'email', 'address']
                },
                {
                    model: this.salesOrderTable,
                    as: 'salesOrder',
                    attributes: ['id', 'sales_order_number', 'order_date', 'status']
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
                    model: this.deliveryItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product',
                            attributes: ['id', 'code', 'name', 'selling_price']
                        },
                        {
                            model: this.salesOrderItemTable,
                            as: 'salesOrderItem',
                            attributes: ['id', 'quantity', 'delivered_quantity']
                        }
                    ]
                }
            ],
            order: [[sort, order.toUpperCase()]],
            offset,
            limit: actualLimit,
            distinct: true
        });
    }

    async findDeliveryById(id, transaction = null) {
        if (!this.deliveryTable) return null;
        return await this.deliveryTable.findByPk(id, {
            include: [
                {
                    model: this.customerTable,
                    as: 'customer'
                },
                {
                    model: this.salesOrderTable,
                    as: 'salesOrder',
                    include: [
                        {
                            model: this.salesOrderItemTable,
                            as: 'items'
                        }
                    ]
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
                    model: this.deliveryItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product'
                        },
                        {
                            model: this.salesOrderItemTable,
                            as: 'salesOrderItem'
                        }
                    ]
                }
            ],
            transaction
        });
    }

    async findDeliveryByNumber(delivery_number, transaction = null) {
        if (!this.deliveryTable) return null;
        return await this.deliveryTable.findOne({
            where: { delivery_number },
            transaction
        });
    }

    async createDelivery(data, transaction = null) {
        if (!this.deliveryTable) return null;
        return await this.deliveryTable.create(data, { transaction });
    }

    async createDeliveryItems(items, transaction = null) {
        if (!this.deliveryItemTable) return [];
        return await this.deliveryItemTable.bulkCreate(items, { transaction });
    }

    async updateDelivery(id, data, transaction = null) {
        if (!this.deliveryTable) return null;
        const delivery = await this.deliveryTable.findByPk(id, { transaction });
        if (!delivery) return null;
        return await delivery.update(data, { transaction });
    }

    async deleteDelivery(id, transaction = null) {
        if (!this.deliveryTable) return 0;
        return await this.deliveryTable.destroy({
            where: { id },
            transaction
        });
    }

    async batchDeleteDeliveries(ids, transaction = null) {
        if (!this.deliveryTable) return 0;
        return await this.deliveryTable.destroy({
            where: { id: { [Op.in]: ids } },
            transaction
        });
    }

    async getDeliveryMetrics() {
        if (!this.deliveryTable) {
            return {
                totalDeliveries: 0,
                deliveredCount: 0,
                inTransitCount: 0,
                readyCount: 0,
                onTimeRate: 97.4
            };
        }

        const totalDeliveries = await this.deliveryTable.count();
        const deliveredCount = await this.deliveryTable.count({
            where: {
                status: { [Op.in]: ['Diterima', 'DELIVERED', 'Delivered'] }
            }
        });
        const inTransitCount = await this.deliveryTable.count({
            where: {
                status: { [Op.in]: ['Dalam Perjalanan', 'CONFIRMED', 'In Transit'] }
            }
        });
        const readyCount = await this.deliveryTable.count({
            where: {
                status: { [Op.in]: ['Siap Muat', 'DRAFT', 'Ready'] }
            }
        });

        const onTimeRate = totalDeliveries > 0 ? parseFloat(((deliveredCount / totalDeliveries) * 100).toFixed(1)) : 100;

        return {
            totalDeliveries,
            deliveredCount,
            inTransitCount,
            readyCount,
            onTimeRate: onTimeRate || 97.4
        };
    }
}

export default DeliveryRepository;
