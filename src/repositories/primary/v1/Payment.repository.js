import { Op } from "sequelize";

class PaymentRepository {
    constructor(server) {
        this.server = server;
    }

    get paymentTable() {
        return this.server.model?.payments?.table;
    }

    get paymentAllocationTable() {
        return this.server.model?.paymentAllocations?.table;
    }

    get customerTable() {
        return this.server.model?.customers?.table;
    }

    get invoiceTable() {
        return this.server.model?.invoices?.table;
    }

    get userTable() {
        return this.server.model?.users?.table;
    }

    async findPayments({ search = '', status = '', payment_method = '', customer_id = null, sort = 'payment_date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.paymentTable) return { count: 0, rows: [] };

        const where = {};

        if (status && status !== 'Semua') {
            where.status = status;
        }

        if (payment_method && payment_method !== 'Semua') {
            where.payment_method = payment_method;
        }

        if (customer_id) {
            where.customer_id = customer_id;
        }

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { payment_number: { [Op.like]: query } },
                { '$customer.name$': { [Op.like]: query } },
                { bank_account: { [Op.like]: query } },
                { reference_number: { [Op.like]: query } }
            ];
        }

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const actualLimit = parseInt(limit, 10);

        const sortFieldMap = {
            'id': 'id',
            'date': 'payment_date',
            'payment_date': 'payment_date',
            'paymentNo': 'payment_number',
            'payment_number': 'payment_number',
            'amount': 'amount',
            'status': 'status',
            'payment_method': 'payment_method',
            'bank_account': 'bank_account',
            'created_at': 'created_at',
            'updated_at': 'updated_at'
        };
        const actualSort = sortFieldMap[sort] || 'payment_date';
        const actualOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        return await this.paymentTable.findAndCountAll({
            where,
            include: [
                {
                    model: this.customerTable,
                    as: 'customer',
                    attributes: ['id', 'code', 'name', 'phone', 'email', 'address']
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.paymentAllocationTable,
                    as: 'allocations',
                    include: [
                        {
                            model: this.invoiceTable,
                            as: 'invoice',
                            attributes: ['id', 'invoice_number', 'invoice_date', 'due_date', 'grand_total', 'paid_amount', 'status']
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

    async findPaymentById(id, transaction = null) {
        if (!this.paymentTable) return null;
        return await this.paymentTable.findByPk(id, {
            include: [
                {
                    model: this.customerTable,
                    as: 'customer'
                },
                {
                    model: this.userTable,
                    as: 'creator',
                    attributes: ['id', 'name', 'username']
                },
                {
                    model: this.paymentAllocationTable,
                    as: 'allocations',
                    include: [
                        {
                            model: this.invoiceTable,
                            as: 'invoice'
                        }
                    ]
                }
            ],
            transaction
        });
    }

    async createPayment(data, transaction = null) {
        return await this.paymentTable.create(data, { transaction });
    }

    async createPaymentAllocations(allocations, transaction = null) {
        return await this.paymentAllocationTable.bulkCreate(allocations, { transaction });
    }

    async updatePayment(id, data, transaction = null) {
        const payment = await this.paymentTable.findByPk(id, { transaction });
        if (!payment) return null;
        return await payment.update(data, { transaction });
    }

    async deletePayment(id, transaction = null) {
        return await this.paymentTable.destroy({
            where: { id },
            transaction
        });
    }

    async batchDeletePayments(ids, transaction = null) {
        return await this.paymentTable.destroy({
            where: { id: { [Op.in]: ids } },
            transaction
        });
    }

    async getPaymentMetrics() {
        if (!this.paymentTable) {
            return {
                totalSettled: 0,
                verifiedCount: 0,
                pendingAmount: 0,
                pendingCount: 0,
                topChannel: '-'
            };
        }

        const payments = await this.paymentTable.findAll({
            attributes: ['amount', 'status', 'bank_account', 'payment_method']
        });

        let totalSettled = 0;
        let verifiedCount = 0;
        let pendingAmount = 0;
        let pendingCount = 0;
        const channelTotals = {};

        for (const p of payments) {
            const amt = parseFloat(p.amount) || 0;
            if (p.status === 'Terverifikasi') {
                totalSettled += amt;
                verifiedCount += 1;

                const channelName = p.bank_account || p.payment_method || 'Lainnya';
                channelTotals[channelName] = (channelTotals[channelName] || 0) + amt;
            } else if (p.status === 'Pending Kliring') {
                pendingAmount += amt;
                pendingCount += 1;
            }
        }

        let topChannel = '-';
        let maxChannelAmount = 0;
        for (const [channel, amt] of Object.entries(channelTotals)) {
            if (amt > maxChannelAmount) {
                maxChannelAmount = amt;
                const pct = totalSettled > 0 ? Math.round((amt / totalSettled) * 100) : 0;
                topChannel = `${channel} (${pct}%)`;
            }
        }

        return {
            totalSettled,
            verifiedCount,
            pendingAmount,
            pendingCount,
            topChannel
        };
    }
}

export default PaymentRepository;
