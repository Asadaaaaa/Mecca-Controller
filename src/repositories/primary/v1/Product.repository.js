import { Op } from "sequelize";

class ProductRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.products?.table;
    }

    get categoryTable() {
        return this.server.model?.productCategories?.table;
    }

    get unitTable() {
        return this.server.model?.units?.table;
    }

    get taxTable() {
        return this.server.model?.taxes?.table;
    }

    async findAll({ search = '', category_id = '', unit_id = '', status = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.table) {
            return { count: 0, rows: [] };
        }

        const where = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } },
                { description: { [Op.like]: query } }
            ];
        }

        if (category_id && category_id !== 'all') {
            where.category_id = parseInt(category_id, 10);
        }

        if (unit_id && unit_id !== 'all') {
            where.unit_id = parseInt(unit_id, 10);
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const validSortFields = ['id', 'code', 'name', 'selling_price', 'status', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = (Math.max(page, 1) - 1) * limit;

        const includes = [];
        if (this.categoryTable) {
            includes.push({
                model: this.categoryTable,
                as: 'category',
                attributes: ['id', 'code', 'name']
            });
        }
        if (this.unitTable) {
            includes.push({
                model: this.unitTable,
                as: 'unit',
                attributes: ['id', 'code', 'name']
            });
        }
        if (this.taxTable) {
            includes.push({
                model: this.taxTable,
                as: 'tax',
                attributes: ['id', 'code', 'name', 'rate']
            });
        }

        const { count, rows } = await this.table.findAndCountAll({
            where,
            include: includes,
            order: [[sortField, sortOrder]],
            distinct: true,
            limit: parseInt(limit, 10),
            offset
        });

        // Map data with stock defaults (will link to warehouse_stocks in Phase 4)
        const items = rows.map(r => {
            const data = r.toJSON();
            return {
                ...data,
                total_stock: 0,
                min_stock: 10
            };
        });

        return {
            count,
            rows: items
        };
    }

    async getMetrics() {
        if (!this.table) {
            return {
                total_products: 0,
                active_products: 0,
                total_categories: 0,
                average_price: 0
            };
        }

        const total = await this.table.count();
        const active = await this.table.count({ where: { status: 'active' } });
        const totalCats = this.categoryTable ? await this.categoryTable.count({ where: { status: 'active' } }) : 0;
        
        const allProducts = await this.table.findAll({ attributes: ['selling_price'] });
        const sumPrice = allProducts.reduce((sum, p) => sum + parseFloat(p.selling_price || 0), 0);
        const avgPrice = total > 0 ? Math.round(sumPrice / total) : 0;

        return {
            total_products: total,
            active_products: active,
            total_categories: totalCats,
            average_price: avgPrice
        };
    }

    async findById(id) {
        if (!this.table) return null;

        const includes = [];
        if (this.categoryTable) includes.push({ model: this.categoryTable, as: 'category' });
        if (this.unitTable) includes.push({ model: this.unitTable, as: 'unit' });
        if (this.taxTable) includes.push({ model: this.taxTable, as: 'tax' });

        const product = await this.table.findByPk(id, { include: includes });
        if (!product) return null;

        const data = product.toJSON();
        return {
            ...data,
            total_stock: 0,
            min_stock: 10
        };
    }

    async findByCode(code) {
        if (!this.table) return null;
        const product = await this.table.findOne({ where: { code } });
        return product ? product.toJSON() : null;
    }

    async generateNextCode() {
        if (!this.table) return 'PRD-001';
        const count = await this.table.count();
        const nextNum = (count + 1).toString().padStart(3, '0');
        return `PRD-${nextNum}`;
    }

    async create(data) {
        if (!this.table) return null;
        const product = await this.table.create(data);
        return this.findById(product.id);
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
        const deletedCount = await this.table.destroy({
            where: {
                id: {
                    [Op.in]: ids
                }
            }
        });
        return deletedCount;
    }
}

export default ProductRepository;
