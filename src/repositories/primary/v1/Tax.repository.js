import { Op } from "sequelize";

class TaxRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.taxes?.table;
    }

    async findAll({ search = '' } = {}) {
        if (!this.table) {
            return [
                { id: 1, code: 'NON', name: 'Non Pajak (0%)', rate: 0, status: 'active' },
                { id: 2, code: 'PPN11', name: 'PPN 11%', rate: 11, status: 'active' },
                { id: 3, code: 'PPN12', name: 'PPN 12%', rate: 12, status: 'active' }
            ];
        }

        const where = {};
        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } }
            ];
        }

        const rows = await this.table.findAll({
            where,
            order: [['id', 'ASC']]
        });

        return rows.map(r => r.toJSON());
    }

    async findById(id) {
        if (!this.table) return null;
        const row = await this.table.findByPk(id);
        return row ? row.toJSON() : null;
    }

    async findByCode(code) {
        if (!this.table) return null;
        const row = await this.table.findOne({ where: { code: code.toUpperCase().trim() } });
        return row ? row.toJSON() : null;
    }

    async create(data) {
        if (!this.table) return null;
        const row = await this.table.create({
            code: data.code.toUpperCase().trim(),
            name: data.name,
            rate: data.rate,
            status: data.status || 'active'
        });
        return row.toJSON();
    }

    async update(id, data) {
        if (!this.table) return null;
        const updateData = {};
        if (data.code) updateData.code = data.code.toUpperCase().trim();
        if (data.name) updateData.name = data.name;
        if (data.rate !== undefined) updateData.rate = data.rate;
        if (data.status) updateData.status = data.status;

        await this.table.update(updateData, { where: { id } });
        return this.findById(id);
    }

    async delete(id) {
        if (!this.table) return false;
        const deleted = await this.table.destroy({ where: { id } });
        return deleted > 0;
    }
}

export default TaxRepository;
