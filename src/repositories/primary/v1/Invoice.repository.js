import { Op } from "sequelize";

class InvoiceRepository {
    constructor(server) {
        this.server = server;
    }

    get invoiceTable() {
        return this.server.model?.invoices?.table;
    }

    get invoiceItemTable() {
        return this.server.model?.invoiceItems?.table;
    }

    get customerTable() {
        return this.server.model?.customers?.table;
    }

    get deliveryTable() {
        return this.server.model?.deliveries?.table;
    }

    get salesOrderTable() {
        return this.server.model?.salesOrders?.table;
    }

    get productTable() {
        return this.server.model?.products?.table;
    }

    get userTable() {
        return this.server.model?.users?.table;
    }

    async findInvoices({ search = '', status = '', customer_id = null, sort = 'invoice_date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.invoiceTable) return { count: 0, rows: [] };

        const where = {};

        if (status && status !== 'Semua') {
            where.status = status;
        }

        if (customer_id) {
            where.customer_id = customer_id;
        }

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { invoice_number: { [Op.like]: query } },
                { '$customer.name$': { [Op.like]: query } },
                { '$delivery.delivery_number$': { [Op.like]: query } },
                { '$salesOrder.sales_order_number$': { [Op.like]: query } }
            ];
        }

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const actualLimit = parseInt(limit, 10);

        const sortFieldMap = {
            'id': 'id',
            'date': 'invoice_date',
            'invoice_date': 'invoice_date',
            'issueDate': 'invoice_date',
            'dueDate': 'due_date',
            'due_date': 'due_date',
            'invoiceNo': 'invoice_number',
            'invoice_number': 'invoice_number',
            'totalAmount': 'grand_total',
            'grand_total': 'grand_total',
            'paidAmount': 'paid_amount',
            'paid_amount': 'paid_amount',
            'status': 'status',
            'created_at': 'created_at',
            'updated_at': 'updated_at'
        };
        const actualSort = sortFieldMap[sort] || 'invoice_date';
        const actualOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        return await this.invoiceTable.findAndCountAll({
            where,
            include: [
                {
                    model: this.customerTable,
                    as: 'customer',
                    attributes: ['id', 'code', 'name', 'phone', 'email', 'address', 'payment_terms']
                },
                {
                    model: this.deliveryTable,
                    as: 'delivery',
                    attributes: ['id', 'delivery_number', 'delivery_date', 'status']
                },
                {
                    model: this.salesOrderTable,
                    as: 'salesOrder',
                    attributes: ['id', 'sales_order_number', 'order_date']
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.invoiceItemTable,
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

    async findInvoiceById(id, transaction = null) {
        if (!this.invoiceTable) return null;
        return await this.invoiceTable.findByPk(id, {
            include: [
                {
                    model: this.customerTable,
                    as: 'customer'
                },
                {
                    model: this.deliveryTable,
                    as: 'delivery'
                },
                {
                    model: this.salesOrderTable,
                    as: 'salesOrder'
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.invoiceItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product'
                        },
                        {
                            model: this.deliveryTable,
                            as: 'delivery'
                        }
                    ]
                }
            ],
            transaction
        });
    }

    async createInvoice(data, transaction = null) {
        return await this.invoiceTable.create(data, { transaction });
    }

    async createInvoiceItems(items, transaction = null) {
        return await this.invoiceItemTable.bulkCreate(items, { transaction });
    }

    async updateInvoice(id, data, transaction = null) {
        const invoice = await this.invoiceTable.findByPk(id, { transaction });
        if (!invoice) return null;
        return await invoice.update(data, { transaction });
    }

    async deleteInvoice(id, transaction = null) {
        return await this.invoiceTable.destroy({
            where: { id },
            transaction
        });
    }

    async batchDeleteInvoices(ids, transaction = null) {
        return await this.invoiceTable.destroy({
            where: { id: { [Op.in]: ids } },
            transaction
        });
    }

    async getInvoiceMetrics() {
        if (!this.invoiceTable) {
            return {
                totalInvoices: 0,
                totalReceivables: 0,
                paidTotal: 0,
                unpaidCount: 0,
                partiallyPaidCount: 0,
                paidCount: 0,
                overdueCount: 0
            };
        }

        const totalInvoices = await this.invoiceTable.count();
        const paidCount = await this.invoiceTable.count({ where: { status: 'Lunas' } });
        const partiallyPaidCount = await this.invoiceTable.count({ where: { status: 'Sebagian' } });
        const unpaidCount = await this.invoiceTable.count({ where: { status: 'Belum Dibayar' } });
        const overdueCount = await this.invoiceTable.count({ where: { status: 'Jatuh Tempo' } });

        const allInvoices = await this.invoiceTable.findAll({
            attributes: ['grand_total', 'paid_amount', 'status', 'due_date']
        });

        let totalReceivables = 0;
        let paidTotal = 0;
        const todayStr = new Date().toISOString().slice(0, 10);

        for (const inv of allInvoices) {
            const grandTotal = parseFloat(inv.grand_total) || 0;
            const paid = parseFloat(inv.paid_amount) || 0;
            paidTotal += paid;

            if (inv.status !== 'Lunas' && inv.status !== 'Dibatalkan') {
                totalReceivables += Math.max(0, grandTotal - paid);
            }
        }

        return {
            totalInvoices,
            totalReceivables,
            paidTotal,
            unpaidCount,
            partiallyPaidCount,
            paidCount,
            overdueCount
        };
    }
}

export default InvoiceRepository;
