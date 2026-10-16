import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const categoryModel = dbConnect.define("category_master", {
    pk_category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fk_hotel_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    category_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    blurb: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: "category_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id"] }],
});