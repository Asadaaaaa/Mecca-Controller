import { DataTypes } from "sequelize";

class FormDraftsModel {
  constructor(server, db = null) {
    const database = db || server.model.db;
    const table = database.define('form_drafts', {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      form_key: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      data: {
        type: DataTypes.TEXT('long'),
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
      tableName: 'form_drafts',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'form_key'],
          name: 'uq_form_drafts_user_key'
        }
      ]
    });

    this.table = table;
  }
}

export default FormDraftsModel;
