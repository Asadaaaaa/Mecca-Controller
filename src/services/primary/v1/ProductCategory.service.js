import { ProductCategoryRepository } from '#repositoriesPrimaryV1';

class ProductCategoryService {
    constructor(server) {
        this.server = server;
        this.ProductCategoryRepository = new ProductCategoryRepository(this.server);
    }

    async getCategories(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';

        const { count, rows } = await this.ProductCategoryRepository.findAll({
            search,
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

    async getCategoryMetrics() {
        return await this.ProductCategoryRepository.getMetrics();
    }

    async getCategoryById(id) {
        const category = await this.ProductCategoryRepository.findById(id);
        if (!category) return -1;
        return category;
    }

    async createCategory(data) {
        const code = data.code || await this.ProductCategoryRepository.generateNextCode();

        const existingCode = await this.ProductCategoryRepository.findByCode(code);
        if (existingCode) {
            return -2; // Duplicate code
        }

        const newCategory = await this.ProductCategoryRepository.create({
            code,
            name: data.name,
            description: data.description || null,
            status: data.status || 'active'
        });

        return newCategory;
    }

    async updateCategory(id, data) {
        const existing = await this.ProductCategoryRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code !== existing.code) {
            const duplicate = await this.ProductCategoryRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        const updated = await this.ProductCategoryRepository.update(id, data);
        return updated;
    }

    async deleteCategory(id) {
        const existing = await this.ProductCategoryRepository.findById(id);
        if (!existing) return -1;

        const success = await this.ProductCategoryRepository.delete(id);
        return success ? 1 : -3;
    }
}

export default ProductCategoryService;
