import { ResponsePresetHelper } from '#helpers';
import { UnitValidator } from '#validatorsPrimaryV1';
import { UnitService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class UnitController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new UnitValidator();
        this.UnitService = new UnitService(this.server);
    }

    async list(req, res) {
        try {
            const units = await this.UnitService.getUnits(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', units));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const unit = await this.UnitService.getUnitById(id);
            if (unit === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Unit not found', 'unit', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', unit));
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

            const unit = await this.UnitService.createUnit(req.body);
            if (unit === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Unit code already exists', 'unit', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Unit created successfully', unit));
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
            const updated = await this.UnitService.updateUnit(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Unit not found', 'unit', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Unit code already exists', 'unit', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Unit updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.UnitService.deleteUnit(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Unit not found', 'unit', { code: -1 }));
            }
            if (result === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Cannot delete unit because it is used by products', 'unit', { code: -3 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Unit deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default UnitController;
