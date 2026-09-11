import { Op } from "sequelize";

class RoleRepository {
    constructor(server) {
        this.server = server;
    }

    get rolesTable() {
        return this.server.model?.roles?.table;
    }

    get permissionsTable() {
        return this.server.model?.permissions?.table;
    }

    get rolePermissionsTable() {
        return this.server.model?.rolePermissions?.table;
    }

    get userRolesTable() {
        return this.server.model?.userRoles?.table;
    }

    async findAll({ search = '' } = {}) {
        if (!this.rolesTable) {
            return [];
        }

        const where = {};
        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { name: { [Op.like]: query } },
                { description: { [Op.like]: query } }
            ];
        }

        const roles = await this.rolesTable.findAll({
            where,
            include: [
                {
                    model: this.permissionsTable,
                    as: 'permissions',
                    through: { attributes: [] }
                }
            ],
            order: [['id', 'ASC']]
        });

        // Count users per role
        const result = await Promise.all(roles.map(async (r) => {
            const roleJson = r.toJSON();
            let userCount = 0;
            if (this.userRolesTable) {
                userCount = await this.userRolesTable.count({ where: { role_id: roleJson.id } });
            }
            return {
                ...roleJson,
                user_count: userCount
            };
        }));

        return result;
    }

    async findById(id) {
        if (!this.rolesTable) return null;
        const role = await this.rolesTable.findByPk(id, {
            include: [
                {
                    model: this.permissionsTable,
                    as: 'permissions',
                    through: { attributes: [] }
                }
            ]
        });

        if (!role) return null;
        const roleJson = role.toJSON();
        let userCount = 0;
        if (this.userRolesTable) {
            userCount = await this.userRolesTable.count({ where: { role_id: roleJson.id } });
        }
        return {
            ...roleJson,
            user_count: userCount
        };
    }

    async findByName(name) {
        if (!this.rolesTable) return null;
        const role = await this.rolesTable.findOne({ where: { name } });
        return role ? role.toJSON() : null;
    }

    async findAllPermissions() {
        if (!this.permissionsTable) {
            return [
                { id: 1, name: 'user.manage', description: 'Create, read, update, and delete users', module: 'Users' },
                { id: 2, name: 'role.manage', description: 'Manage system roles and permission mapping', module: 'Roles' },
                { id: 3, name: 'warehouse.manage', description: 'Create, update, and manage warehouses', module: 'Warehouses' },
                { id: 4, name: 'customer.manage', description: 'Create, update, and manage customers', module: 'Customers' },
                { id: 5, name: 'product.manage', description: 'Manage products, categories, units, and taxes', module: 'Products' },
                { id: 6, name: 'inventory.manage', description: 'Manage stock-in, adjustments, and movements', module: 'Inventory' },
                { id: 7, name: 'quotation.manage', description: 'Manage sales quotations', module: 'Quotations' },
                { id: 8, name: 'sales_order.manage', description: 'Manage sales orders', module: 'Sales Orders' },
                { id: 9, name: 'delivery.manage', description: 'Manage delivery orders and stock deduction', module: 'Deliveries' },
                { id: 10, name: 'invoice.manage', description: 'Manage customer invoices', module: 'Invoices' },
                { id: 11, name: 'payment.manage', description: 'Manage payments and invoice allocations', module: 'Payments' },
                { id: 12, name: 'report.view', description: 'View system analytics and periodic reports', module: 'Reports' },
            ];
        }

        const permissions = await this.permissionsTable.findAll({
            order: [['id', 'ASC']]
        });

        return permissions.map(p => {
            const data = p.toJSON();
            const moduleName = data.name.split('.')[0] || 'general';
            return {
                ...data,
                module: moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
            };
        });
    }

    async getMetrics() {
        if (!this.rolesTable) {
            return {
                total_roles: 5,
                total_permissions: 12,
                total_assigned_users: 1,
                superadmins: 1
            };
        }

        const totalRoles = await this.rolesTable.count();
        const totalPermissions = this.permissionsTable ? await this.permissionsTable.count() : 0;
        const totalAssigned = this.userRolesTable ? await this.userRolesTable.count({ distinct: true, col: 'user_id' }) : 0;
        const superadminRole = await this.findByName('superadmin');
        let superadminCount = 0;
        if (superadminRole && this.userRolesTable) {
            superadminCount = await this.userRolesTable.count({ where: { role_id: superadminRole.id } });
        }

        return {
            total_roles: totalRoles,
            total_permissions: totalPermissions,
            total_assigned_users: totalAssigned,
            superadmins: superadminCount
        };
    }

    async createRole(data, permissionIds = []) {
        if (!this.rolesTable) return null;

        const role = await this.rolesTable.create({
            name: data.name.toLowerCase().trim(),
            description: data.description || null
        });

        if (Array.isArray(permissionIds) && permissionIds.length > 0 && this.rolePermissionsTable) {
            const mappings = permissionIds.map(pid => ({
                role_id: role.id,
                permission_id: pid
            }));
            await this.rolePermissionsTable.bulkCreate(mappings);
        }

        return this.findById(role.id);
    }

    async updateRole(id, data, permissionIds = null) {
        if (!this.rolesTable) return null;

        const updateData = {};
        if (data.name) updateData.name = data.name.toLowerCase().trim();
        if (data.description !== undefined) updateData.description = data.description;

        if (Object.keys(updateData).length > 0) {
            await this.rolesTable.update(updateData, { where: { id } });
        }

        if (Array.isArray(permissionIds) && this.rolePermissionsTable) {
            await this.rolePermissionsTable.destroy({ where: { role_id: id } });
            if (permissionIds.length > 0) {
                const mappings = permissionIds.map(pid => ({
                    role_id: id,
                    permission_id: pid
                }));
                await this.rolePermissionsTable.bulkCreate(mappings);
            }
        }

        return this.findById(id);
    }

    async deleteRole(id) {
        if (!this.rolesTable) return false;

        if (this.rolePermissionsTable) {
            await this.rolePermissionsTable.destroy({ where: { role_id: id } });
        }
        if (this.userRolesTable) {
            await this.userRolesTable.destroy({ where: { role_id: id } });
        }

        const deleted = await this.rolesTable.destroy({ where: { id } });
        return deleted > 0;
    }
}

export default RoleRepository;
