import { WarehouseRepository } from '#repositoriesPrimaryV1';

class WarehouseService {
    constructor(server) {
        this.server = server;
        this.WarehouseRepository = new WarehouseRepository(this.server);
    }

    async getWarehouses(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';

        const { count, rows } = await this.WarehouseRepository.findAll({
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

    async getWarehouseMetrics() {
        return await this.WarehouseRepository.getMetrics();
    }

    async getWarehouseById(id) {
        const warehouse = await this.WarehouseRepository.findById(id);
        if (!warehouse) return -1;
        return warehouse;
    }

    async createWarehouse(data) {
        const code = data.code || await this.WarehouseRepository.generateNextCode();

        const existingCode = await this.WarehouseRepository.findByCode(code);
        if (existingCode) {
            return -2; // Duplicate code
        }

        const newWarehouse = await this.WarehouseRepository.create({
            code,
            name: data.name,
            address: data.address || null,
            pic_name: data.pic_name || null,
            phone: data.phone || null,
            status: data.status || 'active'
        });

        return newWarehouse;
    }

    async updateWarehouse(id, data) {
        const existing = await this.WarehouseRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code !== existing.code) {
            const duplicate = await this.WarehouseRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        const updated = await this.WarehouseRepository.update(id, data);
        return updated;
    }

    async deleteWarehouse(id) {
        const existing = await this.WarehouseRepository.findById(id);
        if (!existing) return -1;

        const success = await this.WarehouseRepository.delete(id);
        return success ? 1 : -3;
    }
}

export default WarehouseService;
