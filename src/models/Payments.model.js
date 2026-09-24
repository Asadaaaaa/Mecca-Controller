import { DataTypes } from "sequelize";

class PaymentsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('payments', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      payment_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Transfer Bank'
      },
      bank_account: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      reference_number: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Terverifikasi'
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
      tableName: 'payments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default PaymentsModel;
