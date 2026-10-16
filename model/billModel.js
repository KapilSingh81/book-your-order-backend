import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

/** Receipt. fk_guest_id null = poore table ka bill, warna sirf us guest ka */
export const billModel = dbConnect.define("bill_master", {
    pk_bill_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_no: { type: DataTypes.STRING(24), allowNull: false },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_table_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_session_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_guest_id: { type: DataTypes.INTEGER, allowNull: true },
    guest_name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: "" },
    method_code: { type: DataTypes.STRING(30), allowNull: false },
    method_name: { type: DataTypes.STRING(60), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    tax_rate: { type: DataTypes.DECIMAL(5, 4), allowNull: false },
    tax: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    paid_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fk_staff_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: "bill_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id", "paid_at"] }, { fields: ["fk_session_id"] }],
});
