class FormDraftRepository {
    constructor(server) {
        this.server = server;
    }

    get table() {
        return this.server.model?.formDrafts?.table;
    }

    async findByUserAndKey(userId, formKey) {
        if (!this.table) return null;
        return await this.table.findOne({
            where: {
                user_id: userId,
                form_key: formKey
            }
        });
    }

    async upsertDraft(userId, formKey, serializedData) {
        if (!this.table) return null;
        const existing = await this.findByUserAndKey(userId, formKey);
        if (existing) {
            return await existing.update({ data: serializedData });
        }
        return await this.table.create({
            user_id: userId,
            form_key: formKey,
            data: serializedData
        });
    }

    async deleteByUserAndKey(userId, formKey) {
        if (!this.table) return 0;
        return await this.table.destroy({
            where: {
                user_id: userId,
                form_key: formKey
            }
        });
    }
}

export default FormDraftRepository;
