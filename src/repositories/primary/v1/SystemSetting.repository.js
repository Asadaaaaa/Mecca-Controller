class SystemSettingRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.systemSettings?.table;
    }

    async getAllSettings() {
        if (!this.table) return [];
        const rows = await this.table.findAll({
            include: [
                {
                    model: this.server.model.users.table,
                    as: 'updater',
                    attributes: ['id', 'name', 'username']
                }
            ],
            order: [['key', 'ASC']]
        });
        return rows.map(r => r.toJSON());
    }

    async getSettingsMap() {
        if (!this.table) return {};
        const rows = await this.table.findAll();
        const map = {};
        rows.forEach(r => {
            map[r.key] = r.value;
        });
        return map;
    }

    async getSettingByKey(key) {
        if (!this.table) return null;
        const row = await this.table.findOne({ where: { key } });
        return row ? row.toJSON() : null;
    }

    async upsertSetting(key, value, description = null, updated_by = null, transaction = null) {
        if (!this.table) return null;
        const existing = await this.table.findOne({ where: { key }, transaction });
        if (existing) {
            const updateData = { value };
            if (description !== null) updateData.description = description;
            if (updated_by !== null) updateData.updated_by = updated_by;
            await existing.update(updateData, { transaction });
            return existing.toJSON();
        } else {
            const created = await this.table.create({
                key,
                value,
                description,
                updated_by
            }, { transaction });
            return created.toJSON();
        }
    }
}

export default SystemSettingRepository;
