import { ResponsePresetHelper } from '#helpers';
import { QuotationValidator } from '#validatorsPrimaryV1';
import { QuotationService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class QuotationController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv({ coerceTypes: true });
        this.DataScheme = new QuotationValidator();
        this.QuotationService = new QuotationService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.QuotationService.getQuotations(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.QuotationService.getQuotationMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const quotation = await this.QuotationService.getQuotationById(id);
            if (!quotation) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', quotation));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async create(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.create);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const user = req.middlewares?.authorization?.data || null;
            const result = await this.QuotationService.createQuotation(req.body, user);
            return res.status(201).json(this.ResponsePreset.resOK('Quotation created successfully', result, 201));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async update(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.update);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const id = req.params.id;
            const result = await this.QuotationService.updateQuotation(id, req.body);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Quotation updated successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async approve(req, res) {
        try {
            const id = req.params.id;
            const user = req.middlewares?.authorization?.data || null;
            const result = await this.QuotationService.approveQuotation(id, user);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Quotation approved successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async reject(req, res) {
        try {
            const id = req.params.id;
            const user = req.middlewares?.authorization?.data || null;
            const result = await this.QuotationService.rejectQuotation(id, user);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Quotation rejected successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async convertToOrder(req, res) {
        try {
            const id = req.params.id;
            const user = req.middlewares?.authorization?.data || null;
            const result = await this.QuotationService.convertToSalesOrder(id, user);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            if (result.error === 'INSUFFICIENT_STOCK') {
                return res.status(400).json(this.ResponsePreset.resErr(400, result.message, 'inventory', result));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Quotation converted to Sales Order successfully', result, 201));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.QuotationService.deleteQuotation(id);
            if (result === 0) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Quotation not found', 'quotation', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Quotation deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async batchDelete(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.batchDelete);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const { ids } = req.body;
            const count = await this.QuotationService.batchDeleteQuotations(ids);
            return res.status(200).json(this.ResponsePreset.resOK(`${count} Quotation(s) deleted successfully`, { count, ids }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default QuotationController;
