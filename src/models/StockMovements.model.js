import { DataTypes } from "sequelize";

class StockMovementsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('stock_movements', {
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
      type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      stock_before: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      stock_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      reference_type: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      reference_id: {
        type: DataTypes.BIGINT,
        allowNull: true
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
      }
    }, {
      tableName: 'stock_movements',
      timestamps: false
    });

    this.table = table;
  }
}

export default StockMovementsModel;
