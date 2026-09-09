import { Op } from "sequelize";

class CustomerRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.customers?.table;
    }

    async findAll({ search = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.table) return { count: 0, rows: [] };

        const where = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } },
                { phone: { [Op.like]: query } },
                { email: { [Op.like]: query } }
            ];
        }

        const validSortFields = ['id', 'code', 'name', 'phone', 'email', 'payment_terms', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = (Math.max(page, 1) - 1) * limit;

        const { count, rows } = await this.table.findAndCountAll({
            where,
            order: [[sortField, sortOrder]],
            limit: parseInt(limit, 10),
            offset
        });

        // Attach transaction-derived metrics (will be calculated from sales/invoices tables in Phase 5-8)
        const items = rows.map(r => {
            const data = r.toJSON();
            return {
                ...data,
                affiliate: '-',
                date_of_birth: null,
                first_visit: null,
                recent_visit: null,
                lifetime_spend: 0,
                total_unpaid: 0,
                status: 'active'
            };
        });

        return {
            count,
            rows: items
        };
    }

    async findById(id) {
        if (!this.table) return null;
        const customer = await this.table.findByPk(id);
        if (!customer) return null;
        const data = customer.toJSON();
        return {
            ...data,
            affiliate: '-',
            date_of_birth: null,
            first_visit: null,
            recent_visit: null,
            lifetime_spend: 0,
            total_unpaid: 0,
            status: 'active'
        };
    }

    async findByCode(code) {
        if (!this.table) return null;
        const customer = await this.table.findOne({ where: { code } });
        return customer ? customer.toJSON() : null;
    }

    async create(data) {
        if (!this.table) return null;
        const customer = await this.table.create(data);
        return customer.toJSON();
    }

    async update(id, data) {
        if (!this.table) return null;
        await this.table.update(data, { where: { id } });
        return this.findById(id);
    }

    async delete(id) {
        if (!this.table) return false;
        const deleted = await this.table.destroy({ where: { id } });
        return deleted > 0;
    }

    async deleteBatch(ids) {
        if (!this.table || !Array.isArray(ids) || ids.length === 0) return 0;
        return await this.table.destroy({
            where: {
                id: { [Op.in]: ids }
            }
        });
    }

    async generateNextCode() {
        if (!this.table) return 'CUST-2026-000001';
        const lastCustomer = await this.table.findOne({
            order: [['id', 'DESC']]
        });
        const nextNumber = lastCustomer ? Number(lastCustomer.id) + 1 : 1;
        const padded = String(nextNumber).padStart(6, '0');
        const year = new Date().getFullYear();
        return `CUST-${year}-${padded}`;
    }

    async getMetrics() {
        if (!this.table) {
            return {
                totalCustomers: 0,
                newThisMonth: 0,
                returningCustomers: 0,
                retentionRate: 0,
                biggestSpender: { name: '-', spend: 0, initials: '-' },
                outstandingDebt: 0,
                customersWithDebt: 0
            };
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalCustomers, newThisMonth] = await Promise.all([
            this.table.count(),
            this.table.count({
                where: {
                    created_at: { [Op.gte]: startOfMonth }
                }
            })
        ]);

        return {
            totalCustomers,
            newThisMonth,
            returningCustomers: 0,
            retentionRate: 0,
            biggestSpender: {
                name: 'Belum Ada Transaksi',
                spend: 0,
                initials: 'NA'
            },
            outstandingDebt: 0,
            customersWithDebt: 0
        };
    }
}

export default CustomerRepository;
