import { DataTypes } from "sequelize";

class TaxesModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('taxes', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
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
      tableName: 'taxes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default TaxesModel;
