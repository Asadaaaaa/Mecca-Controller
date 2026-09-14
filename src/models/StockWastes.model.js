import { DataTypes } from "sequelize";

class StockWastesModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('stock_wastes', {
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
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      loss_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      reason: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Menunggu Approval'
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
      tableName: 'stock_wastes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default StockWastesModel;
