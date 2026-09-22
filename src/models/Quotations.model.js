import { DataTypes } from "sequelize";

class QuotationsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('quotations', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      quotation_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      quotation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      grand_total: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'DRAFT'
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
      tableName: 'quotations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default QuotationsModel;
