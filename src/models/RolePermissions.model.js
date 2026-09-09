import { DataTypes } from "sequelize";

class RolePermissionsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('role_permissions', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        }
      },
      permission_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'permissions',
          key: 'id'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'role_permissions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default RolePermissionsModel;
