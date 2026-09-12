import { DataTypes } from "sequelize";

class ProductsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('products', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      category_id: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      unit_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      selling_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax_id: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
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
      tableName: 'products',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    this.table = table;
  }
}

export default ProductsModel;
