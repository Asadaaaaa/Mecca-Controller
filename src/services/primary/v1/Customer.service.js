import { CustomerRepository } from '#repositoriesPrimaryV1';

class CustomerService {
    constructor(server) {
        this.server = server;
        this.CustomerRepository = new CustomerRepository(this.server);
    }

    async getCustomers(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';
        const hasDebt = query.hasDebt === 'true' || query.hasDebt === true;

        const { count, rows } = await this.CustomerRepository.findAll({
            search,
            status,
            sort,
            order,
            page,
            limit,
            hasDebt
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

    async getCustomerMetrics() {
        return await this.CustomerRepository.getMetrics();
    }

    async getCustomerById(id) {
        const customer = await this.CustomerRepository.findById(id);
        if (!customer) return -1;
        return customer;
    }

    async createCustomer(data) {
        const code = data.code || await this.CustomerRepository.generateNextCode();

        const newCustomer = await this.CustomerRepository.create({
            code,
            name: data.name,
            pic_name: data.pic_name || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            payment_terms: data.payment_terms !== undefined && data.payment_terms !== null ? data.payment_terms : 30
        });

        return newCustomer;
    }

    async updateCustomer(id, data) {
        const existing = await this.CustomerRepository.findById(id);
        if (!existing) return -1;

        const updated = await this.CustomerRepository.update(id, data);
        return updated;
    }

    async deleteCustomer(id) {
        const existing = await this.CustomerRepository.findById(id);
        if (!existing) return -1;

        const success = await this.CustomerRepository.delete(id);
        return success ? 1 : -2;
    }

    async batchDeleteCustomers(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        const count = await this.CustomerRepository.deleteBatch(ids);
        return count;
    }
}

export default CustomerService;
