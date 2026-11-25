import { ResponsePresetHelper } from '#helpers';
import { FormDraftService } from '#servicesPrimaryV1';

class FormDraftController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.draftService = new FormDraftService(this.server);
    }

    getUserId(req) {
        const user = req.middlewares?.authorization?.data || req.middlewares?.authorization || null;
        return user?.userId || user?.id || null;
    }

    async get(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                return res.status(401).json(this.ResponsePreset.resErr(401, 'Unauthorized', 'token', { code: -1 }));
            }

            const formKey = (req.params.formKey || '').trim();
            if (!formKey) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'formKey is required', 'validator', { code: -1 }));
            }

            const draft = await this.draftService.getDraft(userId, formKey);
            return res.status(200).json(this.ResponsePreset.resOK('OK', draft));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async save(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                return res.status(401).json(this.ResponsePreset.resErr(401, 'Unauthorized', 'token', { code: -1 }));
            }

            const formKey = (req.params.formKey || '').trim();
            if (!formKey) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'formKey is required', 'validator', { code: -1 }));
            }

            if (req.body?.data === undefined) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Draft data is required', 'validator', { code: -1 }));
            }

            const saved = await this.draftService.saveDraft(userId, formKey, req.body.data);
            return res.status(200).json(this.ResponsePreset.resOK('Draft saved', saved));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async remove(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                return res.status(401).json(this.ResponsePreset.resErr(401, 'Unauthorized', 'token', { code: -1 }));
            }

            const formKey = (req.params.formKey || '').trim();
            if (!formKey) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'formKey is required', 'validator', { code: -1 }));
            }

            const result = await this.draftService.deleteDraft(userId, formKey);
            return res.status(200).json(this.ResponsePreset.resOK('Draft deleted', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default FormDraftController;
