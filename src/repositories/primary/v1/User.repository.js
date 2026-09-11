import { Op } from "sequelize";
import { randomUUID } from "crypto";

class UserRepository {
    constructor(server) {
        this.server = server;
    }

    get usersTable() {
        return this.server.model?.users?.table;
    }

    get rolesTable() {
        return this.server.model?.roles?.table;
    }

    get userRolesTable() {
        return this.server.model?.userRoles?.table;
    }

    get permissionsTable() {
        return this.server.model?.permissions?.table;
    }

    async getUserDataByIdentity(identity) {
        if (!this.usersTable) {
            // Fallback for mock if DB_ENABLE is false
            if (identity === 'admin' || identity === 'admin@mecca.com') {
                return {
                    id: 1,
                    uuid: 'a0000000-0000-0000-0000-000000000001',
                    name: 'Administrator',
                    email: 'admin@mecca.com',
                    username: 'admin',
                    password: '178ced3dd9e088c3b7d257d2c2df02123cd5de2eea0bacfbb84e845e6796ee30', // sha256('admin123-meccaSalt2026')
                    status: 'active',
                    roles: [{ name: 'superadmin', permissions: [{ name: 'user.manage' }] }]
                };
            }
            return null;
        }

        const user = await this.usersTable.findOne({
            where: {
                [Op.or]: [
                    { username: identity },
                    { email: identity }
                ]
            },
            include: [
                {
                    model: this.rolesTable,
                    as: 'roles',
                    through: { attributes: [] },
                    include: [
                        {
                            model: this.permissionsTable,
                            as: 'permissions',
                            through: { attributes: [] }
                        }
                    ]
                }
            ]
        });

        return user ? user.toJSON() : null;
    }

    async findAll({ search = '', role = '', status = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.usersTable) {
            return {
                count: 1,
                rows: [
                    {
                        id: 1,
                        uuid: 'a0000000-0000-0000-0000-000000000001',
                        name: 'Administrator',
                        email: 'admin@mecca.com',
                        username: 'admin',
                        status: 'active',
                        roles: [{ id: 1, name: 'superadmin', description: 'Super Administrator' }],
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ]
            };
        }

        const where = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { username: { [Op.like]: query } },
                { email: { [Op.like]: query } }
            ];
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const roleInclude = {
            model: this.rolesTable,
            as: 'roles',
            through: { attributes: [] }
        };

        if (role && role !== 'all') {
            roleInclude.where = { name: role };
        }

        const validSortFields = ['id', 'name', 'username', 'email', 'status', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = (Math.max(page, 1) - 1) * limit;

        const { count, rows } = await this.usersTable.findAndCountAll({
            where,
            attributes: ['id', 'uuid', 'name', 'email', 'username', 'status', 'created_at', 'updated_at'],
            include: [roleInclude],
            order: [[sortField, sortOrder]],
            distinct: true,
            limit: parseInt(limit, 10),
            offset
        });

        return {
            count,
            rows: rows.map(r => r.toJSON())
        };
    }

    async getMetrics() {
        if (!this.usersTable) {
            return {
                total_users: 1,
                active_users: 1,
                inactive_users: 0,
                superadmin_count: 1
            };
        }

        const total = await this.usersTable.count();
        const active = await this.usersTable.count({ where: { status: 'active' } });
        const inactive = await this.usersTable.count({ where: { status: { [Op.ne]: 'active' } } });

        let superadminCount = 0;
        if (this.rolesTable && this.userRolesTable) {
            const superadminRole = await this.rolesTable.findOne({ where: { name: 'superadmin' } });
            if (superadminRole) {
                superadminCount = await this.userRolesTable.count({ where: { role_id: superadminRole.id } });
            }
        }

        return {
            total_users: total,
            active_users: active,
            inactive_users: inactive,
            superadmin_count: superadminCount
        };
    }

    async getUserById(id) {
        if (!this.usersTable) {
            if (id === 1 || id === '1') {
                return {
                    id: 1,
                    uuid: 'a0000000-0000-0000-0000-000000000001',
                    name: 'Administrator',
                    email: 'admin@mecca.com',
                    username: 'admin',
                    status: 'active',
                    roles: [{ id: 1, name: 'superadmin', description: 'Super Administrator' }]
                };
            }
            return null;
        }

        const user = await this.usersTable.findByPk(id, {
            attributes: ['id', 'uuid', 'name', 'email', 'username', 'status', 'created_at', 'updated_at'],
            include: [
                {
                    model: this.rolesTable,
                    as: 'roles',
                    through: { attributes: [] },
                    include: [
                        {
                            model: this.permissionsTable,
                            as: 'permissions',
                            through: { attributes: [] }
                        }
                    ]
                }
            ]
        });

        return user ? user.toJSON() : null;
    }

    async findByUsername(username) {
        if (!this.usersTable) return null;
        const user = await this.usersTable.findOne({ where: { username } });
        return user ? user.toJSON() : null;
    }

    async findByEmail(email) {
        if (!this.usersTable) return null;
        const user = await this.usersTable.findOne({ where: { email } });
        return user ? user.toJSON() : null;
    }

    async create(userData, roleIds = []) {
        if (!this.usersTable) return null;

        const uuid = randomUUID();
        const user = await this.usersTable.create({
            uuid,
            name: userData.name,
            email: userData.email.toLowerCase().trim(),
            username: userData.username.toLowerCase().trim(),
            password: userData.password,
            status: userData.status || 'active'
        });

        if (Array.isArray(roleIds) && roleIds.length > 0 && this.userRolesTable) {
            const mappings = roleIds.map(rid => ({
                user_id: user.id,
                role_id: rid
            }));
            await this.userRolesTable.bulkCreate(mappings);
        }

        return this.getUserById(user.id);
    }

    async update(id, userData, roleIds = null) {
        if (!this.usersTable) return null;

        const updateData = {};
        if (userData.name) updateData.name = userData.name;
        if (userData.email) updateData.email = userData.email.toLowerCase().trim();
        if (userData.username) updateData.username = userData.username.toLowerCase().trim();
        if (userData.password) updateData.password = userData.password;
        if (userData.status) updateData.status = userData.status;

        if (Object.keys(updateData).length > 0) {
            await this.usersTable.update(updateData, { where: { id } });
        }

        if (Array.isArray(roleIds) && this.userRolesTable) {
            await this.userRolesTable.destroy({ where: { user_id: id } });
            if (roleIds.length > 0) {
                const mappings = roleIds.map(rid => ({
                    user_id: id,
                    role_id: rid
                }));
                await this.userRolesTable.bulkCreate(mappings);
            }
        }

        return this.getUserById(id);
    }

    async delete(id) {
        if (!this.usersTable) return false;

        if (this.userRolesTable) {
            await this.userRolesTable.destroy({ where: { user_id: id } });
        }

        const deleted = await this.usersTable.destroy({ where: { id } });
        return deleted > 0;
    }
}

export default UserRepository;