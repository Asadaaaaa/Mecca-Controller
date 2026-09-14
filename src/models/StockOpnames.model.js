import { DataTypes } from "sequelize";

class StockOpnamesModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('stock_opnames', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      document_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      warehouse_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      inspector_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      items_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      discrepancy_units: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      discrepancy_value: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Menunggu Review'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_by: {
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
      tableName: 'stock_opnames',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default StockOpnamesModel;
