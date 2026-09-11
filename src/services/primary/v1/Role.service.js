import { RoleRepository } from '#repositoriesPrimaryV1';

class RoleService {
    constructor(server) {
        this.server = server;
        this.RoleRepository = new RoleRepository(this.server);
    }

    async getRoles(query) {
        const search = query.search || '';
        const roles = await this.RoleRepository.findAll({ search });
        return roles;
    }

    async getPermissions() {
        return await this.RoleRepository.findAllPermissions();
    }

    async getRoleMetrics() {
        return await this.RoleRepository.getMetrics();
    }

    async getRoleById(id) {
        const role = await this.RoleRepository.findById(id);
        if (!role) return -1;
        return role;
    }

    async createRole(data) {
        const existing = await this.RoleRepository.findByName(data.name.toLowerCase().trim());
        if (existing) {
            return -2; // Name already exists
        }

        const newRole = await this.RoleRepository.createRole(data, data.permission_ids || []);
        return newRole;
    }

    async updateRole(id, data) {
        const existing = await this.RoleRepository.findById(id);
        if (!existing) return -1;

        if (existing.name === 'superadmin' && data.name && data.name.toLowerCase().trim() !== 'superadmin') {
            return -3; // Cannot rename superadmin
        }

        if (data.name && data.name.toLowerCase().trim() !== existing.name) {
            const duplicate = await this.RoleRepository.findByName(data.name.toLowerCase().trim());
            if (duplicate) return -2;
        }

        const updated = await this.RoleRepository.updateRole(id, data, data.permission_ids);
        return updated;
    }

    async deleteRole(id) {
        const existing = await this.RoleRepository.findById(id);
        if (!existing) return -1;

        if (existing.name === 'superadmin') {
            return -4; // Cannot delete superadmin
        }

        const success = await this.RoleRepository.deleteRole(id);
        return success ? 1 : -5;
    }
}

export default RoleService;
