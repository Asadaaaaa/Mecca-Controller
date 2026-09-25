import { ResponsePresetHelper } from '#helpers';
import { DeliveryValidator } from '#validatorsPrimaryV1';
import { DeliveryService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class DeliveryController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv({ coerceTypes: true });
        this.DataScheme = new DeliveryValidator();
        this.DeliveryService = new DeliveryService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.DeliveryService.getDeliveries(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.DeliveryService.getDeliveryMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const delivery = await this.DeliveryService.getDeliveryById(id);
            if (!delivery) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Delivery not found', 'delivery', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', delivery));
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
            const result = await this.DeliveryService.createDelivery(req.body, user);

            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            if (result === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Quantity exceeds remaining Sales Order quantity', 'delivery', { code: -2 }));
            }
            if (result === -4) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'No valid delivery items provided', 'delivery', { code: -4 }));
            }
            if (result && result.error) {
                return res.status(400).json(this.ResponsePreset.resErr(400, result.message, 'delivery', result));
            }

            return res.status(201).json(this.ResponsePreset.resOK('Delivery order created successfully', result, 201));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async confirm(req, res) {
        try {
            const id = req.params.id;
            const user = req.middlewares?.authorization?.data || null;
            const result = await this.DeliveryService.confirmDelivery(id, user);

            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Delivery not found', 'delivery', { code: -1 }));
            }
            if (result === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Delivery is already confirmed or delivered', 'delivery', { code: -2 }));
            }
            if (result && result.error === 'INSUFFICIENT_STOCK') {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    `Stok tidak mencukupi untuk ${result.product_name || 'Produk ID ' + result.product_id} (Tersedia: ${result.available}, Diminta: ${result.requested})`,
                    'inventory',
                    result
                ));
            }

            return res.status(200).json(this.ResponsePreset.resOK('Delivery confirmed and stock deducted successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async complete(req, res) {
        try {
            const id = req.params.id;
            const user = req.middlewares?.authorization?.data || null;
            const result = await this.DeliveryService.completeDelivery(id, user);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Delivery not found', 'delivery', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Delivery marked as completed / received', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.DeliveryService.deleteDelivery(id);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Delivery not found', 'delivery', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Delivery deleted successfully', null));
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
            await this.DeliveryService.batchDeleteDeliveries(ids);
            return res.status(200).json(this.ResponsePreset.resOK('Deliveries deleted successfully', null));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default DeliveryController;
