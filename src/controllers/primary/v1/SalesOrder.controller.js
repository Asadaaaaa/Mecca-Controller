import { ResponsePresetHelper } from '#helpers';
import { SalesOrderValidator } from '#validatorsPrimaryV1';
import { SalesOrderService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class SalesOrderController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv({ coerceTypes: true });
        this.DataScheme = new SalesOrderValidator();
        this.SalesOrderService = new SalesOrderService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.SalesOrderService.getSalesOrders(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.SalesOrderService.getSalesOrderMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const salesOrder = await this.SalesOrderService.getSalesOrderById(id);
            if (!salesOrder) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', salesOrder));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async availableStock(req, res) {
        try {
            const { warehouse_id, product_id, exclude_so_id } = req.query;
            if (!warehouse_id || !product_id) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'warehouse_id and product_id are required', 'validator', { code: -1 }));
            }
            const stockInfo = await this.SalesOrderService.getAvailableStock(
                parseInt(warehouse_id, 10),
                parseInt(product_id, 10),
                exclude_so_id ? parseInt(exclude_so_id, 10) : null
            );
            return res.status(200).json(this.ResponsePreset.resOK('OK', stockInfo));
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
            const result = await this.SalesOrderService.createSalesOrder(req.body, user);
            if (result && result.error === 'INSUFFICIENT_STOCK') {
                return res.status(400).json(this.ResponsePreset.resErr(400, result.message, 'inventory', result));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Sales Order created successfully', result, 201));
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
            const result = await this.SalesOrderService.updateSalesOrder(id, req.body);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            if (result.error === 'INSUFFICIENT_STOCK') {
                return res.status(400).json(this.ResponsePreset.resErr(400, result.message, 'inventory', result));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Sales Order updated successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async confirm(req, res) {
        try {
            const id = req.params.id;
            const result = await this.SalesOrderService.confirmSalesOrder(id);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            if (result.error === 'INSUFFICIENT_STOCK') {
                return res.status(400).json(this.ResponsePreset.resErr(400, result.message, 'inventory', result));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Sales Order confirmed successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async cancel(req, res) {
        try {
            const id = req.params.id;
            const result = await this.SalesOrderService.cancelSalesOrder(id);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Sales Order cancelled successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.SalesOrderService.deleteSalesOrder(id);
            if (result === 0) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sales Order not found', 'sales_order', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Sales Order deleted successfully', { id }));
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
            const count = await this.SalesOrderService.batchDeleteSalesOrders(ids);
            return res.status(200).json(this.ResponsePreset.resOK(`${count} Sales Order(s) deleted successfully`, { count, ids }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default SalesOrderController;
