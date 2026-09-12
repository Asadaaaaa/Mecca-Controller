import { ResponsePresetHelper } from '#helpers';
import { ProductValidator } from '#validatorsPrimaryV1';
import { ProductService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class ProductController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new ProductValidator();
        this.ProductService = new ProductService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.ProductService.getProducts(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.ProductService.getProductMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const product = await this.ProductService.getProductById(id);
            if (product === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Product not found', 'product', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', product));
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

            const product = await this.ProductService.createProduct(req.body);
            if (product === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Product code already exists', 'product', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Product created successfully', product));
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
            const updated = await this.ProductService.updateProduct(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Product not found', 'product', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Product code already exists', 'product', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Product updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.ProductService.deleteProduct(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Product not found', 'product', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Product deleted successfully', { id }));
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
            const deletedCount = await this.ProductService.batchDeleteProducts(ids);
            return res.status(200).json(this.ResponsePreset.resOK('Batch delete products successfully', { count: deletedCount }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default ProductController;
