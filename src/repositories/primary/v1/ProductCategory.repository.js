import { Op } from "sequelize";

class ProductCategoryRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.productCategories?.table;
    }

    get productsTable() {
        return this.server.model?.products?.table;
    }

    async findAll({ search = '', status = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
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

        if (status && status !== 'all') {
            where.status = status;
        }

        const validSortFields = ['id', 'code', 'name', 'status', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = (Math.max(page, 1) - 1) * limit;

        const { count, rows } = await this.table.findAndCountAll({
            where,
            order: [[sortField, sortOrder]],
            limit: parseInt(limit, 10),
            offset
        });

        // Attach product count per category
        const items = await Promise.all(rows.map(async (r) => {
            const data = r.toJSON();
            let productCount = 0;
            if (this.productsTable) {
                productCount = await this.productsTable.count({ where: { category_id: data.id } });
            }
            return {
                ...data,
                product_count: productCount
            };
        }));

        return {
            count,
            rows: items
        };
    }

    async getMetrics() {
        if (!this.table) {
            return {
                total_categories: 0,
                active_categories: 0,
                inactive_categories: 0,
                total_products: 0
            };
        }

        const total = await this.table.count();
        const active = await this.table.count({ where: { status: 'active' } });
        const inactive = await this.table.count({ where: { status: 'inactive' } });
        const totalProducts = this.productsTable ? await this.productsTable.count() : 0;

        return {
            total_categories: total,
            active_categories: active,
            inactive_categories: inactive,
            total_products: totalProducts
        };
    }

    async findById(id) {
        if (!this.table) return null;
        const cat = await this.table.findByPk(id);
        if (!cat) return null;
        const data = cat.toJSON();
        let productCount = 0;
        if (this.productsTable) {
            productCount = await this.productsTable.count({ where: { category_id: data.id } });
        }
        return {
            ...data,
            product_count: productCount
        };
    }

    async findByCode(code) {
        if (!this.table) return null;
        const cat = await this.table.findOne({ where: { code } });
        return cat ? cat.toJSON() : null;
    }

    async generateNextCode() {
        if (!this.table) return 'CAT-001';
        const count = await this.table.count();
        const nextNum = (count + 1).toString().padStart(3, '0');
        return `CAT-${nextNum}`;
    }

    async create(data) {
        if (!this.table) return null;
        const cat = await this.table.create(data);
        return cat.toJSON();
    }

    async update(id, data) {
        if (!this.table) return null;
        await this.table.update(data, { where: { id } });
        return this.findById(id);
    }

    async delete(id) {
        if (!this.table) return false;
        // Unlink or check if products exist
        const deleted = await this.table.destroy({ where: { id } });
        return deleted > 0;
    }
}

export default ProductCategoryRepository;
