import { FormDraftRepository } from '#repositoriesPrimaryV1';

class FormDraftService {
    constructor(server) {
        this.server = server;
        this.draftRepo = new FormDraftRepository(this.server);
    }

    async getDraft(userId, formKey) {
        const row = await this.draftRepo.findByUserAndKey(userId, formKey);
        if (!row) return null;

        let parsedData = null;
        try {
            parsedData = JSON.parse(row.data);
        } catch {
            return null;
        }

        return {
            form_key: row.form_key,
            data: parsedData,
            saved_at: row.updated_at
        };
    }

    async saveDraft(userId, formKey, data) {
        const serializedData = JSON.stringify(data);
        const row = await this.draftRepo.upsertDraft(userId, formKey, serializedData);
        if (!row) return null;

        return {
            form_key: row.form_key,
            saved_at: row.updated_at
        };
    }

    async deleteDraft(userId, formKey) {
        await this.draftRepo.deleteByUserAndKey(userId, formKey);
        return { deleted: true };
    }
}

export default FormDraftService;
