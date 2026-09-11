import { Op } from "sequelize";

class WarehouseRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.warehouses?.table;
    }

    async findAll({ search = '', status = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.table) {
            return {
                count: 3,
                rows: [
                    { id: 1, code: 'WH-001', name: 'Gudang Utama Jakarta', address: 'Jl. Raya Industri No. 88, Jakarta Timur', pic_name: 'Budi Santoso', phone: '081234567890', status: 'active', created_at: new Date() },
                    { id: 2, code: 'WH-002', name: 'Gudang Transit Surabaya', address: 'Kawasan Industri Rungkut Blok B-12, Surabaya', pic_name: 'Dewi Lestari', phone: '081987654321', status: 'active', created_at: new Date() },
                    { id: 3, code: 'WH-003', name: 'Gudang Logistik Bandung', address: 'Jl. Soekarno Hatta No. 450, Bandung', pic_name: 'Hendra Gunawan', phone: '082133445566', status: 'inactive', created_at: new Date() },
                ]
            };
        }

        const where = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } },
                { pic_name: { [Op.like]: query } },
                { address: { [Op.like]: query } },
                { phone: { [Op.like]: query } }
            ];
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const validSortFields = ['id', 'code', 'name', 'pic_name', 'status', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = (Math.max(page, 1) - 1) * limit;

        const { count, rows } = await this.table.findAndCountAll({
            where,
            order: [[sortField, sortOrder]],
            limit: parseInt(limit, 10),
            offset
        });

        return {
            count,
            rows: rows.map(r => r.toJSON())
        };
    }

    async getMetrics() {
        if (!this.table) {
            return {
                total_warehouses: 3,
                active_warehouses: 2,
                inactive_warehouses: 1,
                total_pics: 3
            };
        }

        const total = await this.table.count();
        const active = await this.table.count({ where: { status: 'active' } });
        const inactive = await this.table.count({ where: { status: 'inactive' } });
        const pics = await this.table.count({
            distinct: true,
            col: 'pic_name',
            where: { pic_name: { [Op.ne]: null } }
        });

        return {
            total_warehouses: total,
            active_warehouses: active,
            inactive_warehouses: inactive,
            total_pics: pics
        };
    }

    async findById(id) {
        if (!this.table) return null;
        const warehouse = await this.table.findByPk(id);
        return warehouse ? warehouse.toJSON() : null;
    }

    async findByCode(code) {
        if (!this.table) return null;
        const warehouse = await this.table.findOne({ where: { code } });
        return warehouse ? warehouse.toJSON() : null;
    }

    async generateNextCode() {
        if (!this.table) return 'WH-001';
        const count = await this.table.count();
        const nextNum = (count + 1).toString().padStart(3, '0');
        return `WH-${nextNum}`;
    }

    async create(data) {
        if (!this.table) return null;
        const warehouse = await this.table.create(data);
        return warehouse.toJSON();
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
}

export default WarehouseRepository;
