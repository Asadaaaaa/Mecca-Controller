import { DataTypes } from "sequelize";

class DeliveriesModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('deliveries', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      delivery_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      sales_order_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      warehouse_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      delivery_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      courier_fleet: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      tracking_number: {
        type: DataTypes.STRING(100),
        allowNull: true
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
      tableName: 'deliveries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default DeliveriesModel;
