import { UserRepository } from '#repositoriesPrimaryV1';
import { SHA256Helper } from '#helpers';

class UserService {
    constructor(server) {
        this.server = server;
        this.UserRepository = new UserRepository(this.server);
        this.SHA256Helper = new SHA256Helper();
    }

    async getUsers(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const role = query.role || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';

        const { count, rows } = await this.UserRepository.findAll({
            search,
            role,
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

    async getUserMetrics() {
        return await this.UserRepository.getMetrics();
    }

    async getUserById(id) {
        const user = await this.UserRepository.getUserById(id);
        if (!user) return -1;
        return user;
    }

    async createUser(data) {
        const existingUsername = await this.UserRepository.findByUsername(data.username.toLowerCase().trim());
        if (existingUsername) {
            return -2; // Username already in use
        }

        const existingEmail = await this.UserRepository.findByEmail(data.email.toLowerCase().trim());
        if (existingEmail) {
            return -3; // Email already in use
        }

        const hashedPassword = this.SHA256Helper.getHash(data.password, this.server.env.SALT_SECRET || 'meccaSalt2026');

        const newUser = await this.UserRepository.create({
            name: data.name,
            email: data.email,
            username: data.username,
            password: hashedPassword,
            status: data.status || 'active'
        }, data.role_ids || []);

        return newUser;
    }

    async updateUser(id, data) {
        const existing = await this.UserRepository.getUserById(id);
        if (!existing) return -1;

        if (data.username && data.username.toLowerCase().trim() !== existing.username) {
            const duplicateUsername = await this.UserRepository.findByUsername(data.username.toLowerCase().trim());
            if (duplicateUsername) return -2;
        }

        if (data.email && data.email.toLowerCase().trim() !== existing.email) {
            const duplicateEmail = await this.UserRepository.findByEmail(data.email.toLowerCase().trim());
            if (duplicateEmail) return -3;
        }

        const updatePayload = {
            name: data.name,
            email: data.email,
            username: data.username,
            status: data.status
        };

        if (data.password && data.password.trim() !== '') {
            updatePayload.password = this.SHA256Helper.getHash(data.password, this.server.env.SALT_SECRET || 'meccaSalt2026');
        }

        const updated = await this.UserRepository.update(id, updatePayload, data.role_ids);
        return updated;
    }

    async deleteUser(id) {
        const existing = await this.UserRepository.getUserById(id);
        if (!existing) return -1;

        // Prevent deleting the primary superadmin user (id 1 or username admin)
        if (existing.id === 1 || existing.username === 'admin') {
            return -4;
        }

        const success = await this.UserRepository.delete(id);
        return success ? 1 : -5;
    }
}

export default UserService;
