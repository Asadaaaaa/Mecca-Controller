import { ResponsePresetHelper } from '#helpers';
import { WarehouseValidator } from '#validatorsPrimaryV1';
import { WarehouseService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class WarehouseController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new WarehouseValidator();
        this.WarehouseService = new WarehouseService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.WarehouseService.getWarehouses(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.WarehouseService.getWarehouseMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const warehouse = await this.WarehouseService.getWarehouseById(id);
            if (warehouse === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Warehouse not found', 'warehouse', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', warehouse));
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

            const warehouse = await this.WarehouseService.createWarehouse(req.body);
            if (warehouse === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Warehouse code already exists', 'warehouse', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Warehouse created successfully', warehouse));
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
            const updated = await this.WarehouseService.updateWarehouse(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Warehouse not found', 'warehouse', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Warehouse code already exists', 'warehouse', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Warehouse updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.WarehouseService.deleteWarehouse(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Warehouse not found', 'warehouse', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Warehouse deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default WarehouseController;
