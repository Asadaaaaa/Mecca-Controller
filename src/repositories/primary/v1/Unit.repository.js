import { Op } from "sequelize";

class UnitRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.units?.table;
    }

    get productsTable() {
        return this.server.model?.products?.table;
    }

    async findAll({ search = '' } = {}) {
        if (!this.table) {
            return [
                { id: 1, code: 'PCS', name: 'Pieces / Satuan', description: 'Satuan per buah/pcs', status: 'active' },
                { id: 2, code: 'BOX', name: 'Box / Kotak', description: 'Kemasan box karton', status: 'active' }
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
            description: data.description || null,
            status: data.status || 'active'
        });
        return row.toJSON();
    }

    async update(id, data) {
        if (!this.table) return null;
        const updateData = {};
        if (data.code) updateData.code = data.code.toUpperCase().trim();
        if (data.name) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.status) updateData.status = data.status;

        await this.table.update(updateData, { where: { id } });
        return this.findById(id);
    }

    async delete(id) {
        if (!this.table) return false;
        const count = this.productsTable ? await this.productsTable.count({ where: { unit_id: id } }) : 0;
        if (count > 0) return false; // In use

        const deleted = await this.table.destroy({ where: { id } });
        return deleted > 0;
    }
}

export default UnitRepository;
