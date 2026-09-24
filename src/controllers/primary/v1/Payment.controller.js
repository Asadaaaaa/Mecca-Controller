import { ResponsePresetHelper } from '#helpers';
import { PaymentValidator } from '#validatorsPrimaryV1';
import { PaymentService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class PaymentController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv({ coerceTypes: true });
        this.DataScheme = new PaymentValidator();
        this.PaymentService = new PaymentService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.PaymentService.getPayments(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.PaymentService.getPaymentMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const payment = await this.PaymentService.getPaymentById(id);
            if (!payment) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Payment not found', 'payment', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', payment));
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
            const result = await this.PaymentService.createPayment(req.body, user?.id);

            return res.status(201).json(this.ResponsePreset.resOK('Payment recorded successfully', result, 201));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(400).json(this.ResponsePreset.resErr(400, error.message, 'payment', { code: -1 }));
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
            const result = await this.PaymentService.updatePayment(id, req.body);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Payment not found', 'payment', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Payment updated successfully', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.PaymentService.deletePayment(id);
            if (!result) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Payment not found', 'payment', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Payment deleted successfully', null));
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
            await this.PaymentService.batchDeletePayments(ids);
            return res.status(200).json(this.ResponsePreset.resOK('Payments deleted successfully', null));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default PaymentController;
