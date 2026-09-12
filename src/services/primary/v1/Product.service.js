import { ProductRepository } from '#repositoriesPrimaryV1';

class ProductService {
    constructor(server) {
        this.server = server;
        this.ProductRepository = new ProductRepository(this.server);
    }

    async getProducts(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const category_id = query.category_id || '';
        const unit_id = query.unit_id || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';

        const { count, rows } = await this.ProductRepository.findAll({
            search,
            category_id,
            unit_id,
            status,
            sort,
            order,
            page,
            limit
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit) || 1
            }
        };
    }

    async getProductMetrics() {
        return await this.ProductRepository.getMetrics();
    }

    async getProductById(id) {
        const product = await this.ProductRepository.findById(id);
        if (!product) return -1;
        return product;
    }

    async createProduct(data) {
        const code = data.code || await this.ProductRepository.generateNextCode();

        const existingCode = await this.ProductRepository.findByCode(code);
        if (existingCode) {
            return -2; // Duplicate code
        }

        const newProduct = await this.ProductRepository.create({
            code,
            name: data.name,
            category_id: data.category_id || null,
            unit_id: data.unit_id,
            selling_price: data.selling_price || 0,
            tax_id: data.tax_id || null,
            description: data.description || null,
            status: data.status || 'active'
        });

        return newProduct;
    }

    async updateProduct(id, data) {
        const existing = await this.ProductRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code !== existing.code) {
            const duplicate = await this.ProductRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        const updated = await this.ProductRepository.update(id, data);
        return updated;
    }

    async deleteProduct(id) {
        const existing = await this.ProductRepository.findById(id);
        if (!existing) return -1;

        const success = await this.ProductRepository.delete(id);
        return success ? 1 : -3;
    }

    async batchDeleteProducts(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        return await this.ProductRepository.deleteBatch(ids);
    }
}

export default ProductService;
