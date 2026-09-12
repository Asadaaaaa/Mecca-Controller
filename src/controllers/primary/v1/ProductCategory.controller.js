import { ResponsePresetHelper } from '#helpers';
import { ProductCategoryValidator } from '#validatorsPrimaryV1';
import { ProductCategoryService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class ProductCategoryController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new ProductCategoryValidator();
        this.ProductCategoryService = new ProductCategoryService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.ProductCategoryService.getCategories(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.ProductCategoryService.getCategoryMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const category = await this.ProductCategoryService.getCategoryById(id);
            if (category === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Category not found', 'category', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', category));
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

            const category = await this.ProductCategoryService.createCategory(req.body);
            if (category === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Category code already exists', 'category', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Category created successfully', category));
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
            const updated = await this.ProductCategoryService.updateCategory(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Category not found', 'category', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Category code already exists', 'category', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Category updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.ProductCategoryService.deleteCategory(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Category not found', 'category', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Category deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default ProductCategoryController;
