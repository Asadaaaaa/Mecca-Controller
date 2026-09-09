import { Op } from "sequelize";

class UserRepository {
    constructor(server) {
        this.server = server;
    }

    async getUserDataByIdentity(identity) {
        if (!this.server.model?.users?.table) {
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

        const user = await this.server.model.users.table.findOne({
            where: {
                [Op.or]: [
                    { username: identity },
                    { email: identity }
                ]
            },
            include: [
                {
                    model: this.server.model.roles.table,
                    as: 'roles',
                    through: { attributes: [] },
                    include: [
                        {
                            model: this.server.model.permissions.table,
                            as: 'permissions',
                            through: { attributes: [] }
                        }
                    ]
                }
            ]
        });

        return user ? user.toJSON() : null;
    }

    async getUserById(id) {
        if (!this.server.model?.users?.table) {
            if (id === 1) {
                return {
                    id: 1,
                    uuid: 'a0000000-0000-0000-0000-000000000001',
                    name: 'Administrator',
                    email: 'admin@mecca.com',
                    username: 'admin',
                    status: 'active',
                    roles: [{ name: 'superadmin' }]
                };
            }
            return null;
        }

        const user = await this.server.model.users.table.findByPk(id, {
            attributes: ['id', 'uuid', 'name', 'email', 'username', 'status', 'created_at', 'updated_at'],
            include: [
                {
                    model: this.server.model.roles.table,
                    as: 'roles',
                    through: { attributes: [] },
                    include: [
                        {
                            model: this.server.model.permissions.table,
                            as: 'permissions',
                            through: { attributes: [] }
                        }
                    ]
                }
            ]
        });

        return user ? user.toJSON() : null;
    }
}

export default UserRepository;