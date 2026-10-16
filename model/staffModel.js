import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const staffModel = dbConnect.define("staff_master", {
    pk_staff_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fk_hotel_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    fk_role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    staff_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    password_hash: {
        type: DataTypes.STRING,    
        allowNull: false,
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
    tableName: "staff_master",
    freezeTableName: true,
    timestamps: true,
});