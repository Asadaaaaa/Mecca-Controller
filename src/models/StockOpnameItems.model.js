import { DataTypes } from "sequelize";

class StockOpnameItemsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('stock_opname_items', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      stock_opname_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      system_stock: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      physical_stock: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      difference: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discrepancy_value: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      notes: {
        type: DataTypes.TEXT,
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
      tableName: 'stock_opname_items',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default StockOpnameItemsModel;
