import { DataTypes } from "sequelize";

class DeliverySalesOrdersModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('delivery_sales_orders', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      delivery_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      sales_order_id: {
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
      tableName: 'delivery_sales_orders',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default DeliverySalesOrdersModel;
