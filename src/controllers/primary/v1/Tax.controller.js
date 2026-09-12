import { ResponsePresetHelper } from '#helpers';
import { TaxValidator } from '#validatorsPrimaryV1';
import { TaxService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class TaxController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new TaxValidator();
        this.TaxService = new TaxService(this.server);
    }

    async list(req, res) {
        try {
            const taxes = await this.TaxService.getTaxes(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', taxes));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const tax = await this.TaxService.getTaxById(id);
            if (tax === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Tax not found', 'tax', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', tax));
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

            const tax = await this.TaxService.createTax(req.body);
            if (tax === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Tax code already exists', 'tax', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Tax created successfully', tax));
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
            const updated = await this.TaxService.updateTax(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Tax not found', 'tax', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Tax code already exists', 'tax', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Tax updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.TaxService.deleteTax(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Tax not found', 'tax', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Tax deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default TaxController;
