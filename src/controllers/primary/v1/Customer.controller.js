import { ResponsePresetHelper } from '#helpers';
import { CustomerValidator } from '#validatorsPrimaryV1';
import { CustomerService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class CustomerController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new CustomerValidator();
        this.CustomerService = new CustomerService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.CustomerService.getCustomers(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.CustomerService.getCustomerMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const customer = await this.CustomerService.getCustomerById(id);
            if (customer === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Customer not found', 'customer', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', customer));
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

            const customer = await this.CustomerService.createCustomer(req.body);
            return res.status(201).json(this.ResponsePreset.resOK('Customer created successfully', customer));
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
            const updated = await this.CustomerService.updateCustomer(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Customer not found', 'customer', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Customer updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.CustomerService.deleteCustomer(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Customer not found', 'customer', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Customer deleted successfully', { id }));
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
            const deletedCount = await this.CustomerService.batchDeleteCustomers(ids);
            return res.status(200).json(this.ResponsePreset.resOK('Customers deleted successfully', { deletedCount }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default CustomerController;
