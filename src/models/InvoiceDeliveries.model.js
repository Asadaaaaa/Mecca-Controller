import { DataTypes } from "sequelize";

class InvoiceDeliveriesModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('invoice_deliveries', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      invoice_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      delivery_id: {
        type: DataTypes.BIGINT,
        allowNull: false
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
      tableName: 'invoice_deliveries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default InvoiceDeliveriesModel;
