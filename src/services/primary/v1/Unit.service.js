import { UnitRepository } from '#repositoriesPrimaryV1';

class UnitService {
    constructor(server) {
        this.server = server;
        this.UnitRepository = new UnitRepository(this.server);
    }

    async getUnits(query) {
        return await this.UnitRepository.findAll(query);
    }

    async getUnitById(id) {
        const unit = await this.UnitRepository.findById(id);
        if (!unit) return -1;
        return unit;
    }

    async createUnit(data) {
        const existing = await this.UnitRepository.findByCode(data.code);
        if (existing) {
            return -2; // Duplicate code
        }

        return await this.UnitRepository.create(data);
    }

    async updateUnit(id, data) {
        const existing = await this.UnitRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code.toUpperCase().trim() !== existing.code) {
            const duplicate = await this.UnitRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        return await this.UnitRepository.update(id, data);
    }

    async deleteUnit(id) {
        const existing = await this.UnitRepository.findById(id);
        if (!existing) return -1;

        const success = await this.UnitRepository.delete(id);
        return success ? 1 : -3;
    }
}

export default UnitService;
