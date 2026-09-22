import { Op } from "sequelize";

class QuotationRepository {
    constructor(server) {
        this.server = server;
    }

    get quotationTable() {
        return this.server.model?.quotations?.table;
    }

    get quotationItemTable() {
        return this.server.model?.quotationItems?.table;
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

    async findQuotations({ search = '', status = '', sort = 'quotation_date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.quotationTable) return { count: 0, rows: [] };

        const where = {};
        const customerWhere = {};

        if (status && status !== 'Semua') {
            where.status = status;
        }

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { quotation_number: { [Op.like]: query } },
                { '$customer.name$': { [Op.like]: query } }
            ];
        }

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const actualLimit = parseInt(limit, 10);

        return await this.quotationTable.findAndCountAll({
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
                    model: this.quotationItemTable,
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
            order: [[sort, order.toUpperCase()]],
            offset,
            limit: actualLimit,
            distinct: true
        });
    }

    async findQuotationById(id, transaction = null) {
        if (!this.quotationTable) return null;
        return await this.quotationTable.findByPk(id, {
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
                    model: this.quotationItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product'
                        }
                    ]
                }
            ],
            transaction
        });
    }

    async findQuotationByNumber(quotation_number, transaction = null) {
        if (!this.quotationTable) return null;
        return await this.quotationTable.findOne({
            where: { quotation_number },
            transaction
        });
    }

    async createQuotation(data, transaction = null) {
        if (!this.quotationTable) return null;
        return await this.quotationTable.create(data, { transaction });
    }

    async createQuotationItems(items, transaction = null) {
        if (!this.quotationItemTable) return [];
        return await this.quotationItemTable.bulkCreate(items, { transaction });
    }

    async deleteQuotationItems(quotation_id, transaction = null) {
        if (!this.quotationItemTable) return 0;
        return await this.quotationItemTable.destroy({
            where: { quotation_id },
            transaction
        });
    }

    async updateQuotation(id, data, transaction = null) {
        if (!this.quotationTable) return null;
        const quotation = await this.quotationTable.findByPk(id, { transaction });
        if (!quotation) return null;
        return await quotation.update(data, { transaction });
    }

    async deleteQuotation(id, transaction = null) {
        if (!this.quotationTable) return 0;
        return await this.quotationTable.destroy({
            where: { id },
            transaction
        });
    }

    async batchDeleteQuotations(ids, transaction = null) {
        if (!this.quotationTable) return 0;
        return await this.quotationTable.destroy({
            where: { id: { [Op.in]: ids } },
            transaction
        });
    }

    async getQuotationMetrics() {
        if (!this.quotationTable) {
            return {
                totalQuotations: 0,
                approvedCount: 0,
                pendingCount: 0,
                pipelineValue: 0,
                winRate: 0
            };
        }

        const totalQuotations = await this.quotationTable.count();
        const approvedCount = await this.quotationTable.count({
            where: {
                status: { [Op.in]: ['Disetujui', 'APPROVED'] }
            }
        });
        const pendingCount = await this.quotationTable.count({
            where: {
                status: { [Op.in]: ['Draf', 'DRAFT', 'Terkirim', 'SENT', 'Menunggu Approval'] }
            }
        });

        const activeQuotations = await this.quotationTable.findAll({
            where: {
                status: { [Op.in]: ['Disetujui', 'APPROVED', 'Terkirim', 'SENT', 'Draf', 'DRAFT'] }
            },
            attributes: ['grand_total']
        });

        const pipelineValue = activeQuotations.reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0);
        const winRate = totalQuotations > 0 ? parseFloat(((approvedCount / totalQuotations) * 100).toFixed(1)) : 0;

        return {
            totalQuotations,
            approvedCount,
            pendingCount,
            pipelineValue,
            winRate
        };
    }
}

export default QuotationRepository;
