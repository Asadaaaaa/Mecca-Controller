import { TaxRepository } from '#repositoriesPrimaryV1';

class TaxService {
    constructor(server) {
        this.server = server;
        this.TaxRepository = new TaxRepository(this.server);
    }

    async getTaxes(query) {
        return await this.TaxRepository.findAll(query);
    }

    async getTaxById(id) {
        const tax = await this.TaxRepository.findById(id);
        if (!tax) return -1;
        return tax;
    }

    async createTax(data) {
        const existing = await this.TaxRepository.findByCode(data.code);
        if (existing) {
            return -2; // Duplicate code
        }

        return await this.TaxRepository.create(data);
    }

    async updateTax(id, data) {
        const existing = await this.TaxRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code.toUpperCase().trim() !== existing.code) {
            const duplicate = await this.TaxRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        return await this.TaxRepository.update(id, data);
    }

    async deleteTax(id) {
        const existing = await this.TaxRepository.findById(id);
        if (!existing) return -1;

        const success = await this.TaxRepository.delete(id);
        return success ? 1 : -3;
    }
}

export default TaxService;
