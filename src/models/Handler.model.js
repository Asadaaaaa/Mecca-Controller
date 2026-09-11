// Library
import { Sequelize } from "sequelize";
import UsersModel from "./Users.model.js";
import RolesModel from "./Roles.model.js";
import PermissionsModel from "./Permissions.model.js";
import UserRolesModel from "./UserRoles.model.js";
import RolePermissionsModel from "./RolePermissions.model.js";
import CustomersModel from "./Customers.model.js";
import WarehousesModel from "./Warehouses.model.js";

class Handler {
    constructor(server) {
        this.server = server;
    }

    async connect() {
        this.server.sendLogs('Connecting to database...');
        try {
            this.db = new Sequelize({
                host: this.server.env.DB_HOST,
                port: this.server.env.DB_PORT,
                username: this.server.env.DB_USERNAME,
                password: this.server.env.DB_PASSWORD,
                database: this.server.env.DB_DATABASE,
                dialect: this.server.env.DB_DIALECT,
                logging: this.server.env.DB_LOGGING === 'true' ? (sql, queryObject) => {
                    this.server.sendLogs('Query: ' + sql);
                } : false
            });
            await this.db.authenticate();
        } catch (err) {
            this.server.sendLogs(err);
            return -1;
        }

        this.server.sendLogs(`Database "${this.db.config.database}" Connected`);

        // Initialize Models
        this.users = new UsersModel(this.server, this.db);
        this.roles = new RolesModel(this.server, this.db);
        this.permissions = new PermissionsModel(this.server, this.db);
        this.userRoles = new UserRolesModel(this.server, this.db);
        this.rolePermissions = new RolePermissionsModel(this.server, this.db);
        this.customers = new CustomersModel(this.server, this.db);
        this.warehouses = new WarehousesModel(this.server, this.db);

        // Associations
        this.users.table.belongsToMany(this.roles.table, {
            through: this.userRoles.table,
            foreignKey: 'user_id',
            otherKey: 'role_id',
            as: 'roles'
        });
        this.roles.table.belongsToMany(this.users.table, {
            through: this.userRoles.table,
            foreignKey: 'role_id',
            otherKey: 'user_id',
            as: 'users'
        });

        this.roles.table.belongsToMany(this.permissions.table, {
            through: this.rolePermissions.table,
            foreignKey: 'role_id',
            otherKey: 'permission_id',
            as: 'permissions'
        });
        this.permissions.table.belongsToMany(this.roles.table, {
            through: this.rolePermissions.table,
            foreignKey: 'permission_id',
            otherKey: 'role_id',
            as: 'roles'
        });

        return this.db;
    }
}

export default Handler;
