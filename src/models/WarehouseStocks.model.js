import { DataTypes } from "sequelize";

class WarehouseStocksModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('warehouse_stocks', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      warehouse_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      min_stock: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 10
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
      tableName: 'warehouse_stocks',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default WarehouseStocksModel;
