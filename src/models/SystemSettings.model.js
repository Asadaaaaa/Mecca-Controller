import { DataTypes } from "sequelize";

class SystemSettingsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('system_settings', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true
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
      tableName: 'system_settings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default SystemSettingsModel;
