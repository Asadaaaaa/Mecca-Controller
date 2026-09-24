import { ResponsePresetHelper } from '#helpers';
import { InvoiceValidator } from '#validatorsPrimaryV1';
import { InvoiceService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class InvoiceController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv({ coerceTypes: true });
        this.DataScheme = new InvoiceValidator();
        this.InvoiceService = new InvoiceService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.InvoiceService.getInvoices(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.InvoiceService.getInvoiceMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const invoice = await this.InvoiceService.getInvoiceById(id);
            if (!invoice) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Invoice not found', 'invoice', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', invoice));
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
            const result = await this.InvoiceService.createInvoice(req.body, user);

            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Delivery Order not found', 'delivery', { code: -1 }));
            }
            if (result === -2) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -2 }));
            }
            if (result === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Customer ID is required', 'customer', { code: -3 }));
            }
            if (result === -4) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'No valid items to invoice', 'invoice', { code: -4 }));
            }

            return res.status(201).json(this.ResponsePreset.resOK('Invoice created successfully', result, 201));
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
            const result = await this.InvoiceService.updateInvoice(id, req.body);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Invoice not found', 'invoice', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Invoice updated successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.InvoiceService.deleteInvoice(id);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Invoice not found', 'invoice', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Invoice deleted successfully', null));
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
            await this.InvoiceService.batchDeleteInvoices(ids);
            return res.status(200).json(this.ResponsePreset.resOK('Invoices deleted successfully', null));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default InvoiceController;
