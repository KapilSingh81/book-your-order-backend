import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const paymentMethodModel = dbConnect.define("payment_method_master", {
    pk_method_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    method_code: { type: DataTypes.STRING(30), allowNull: false },
    method_name: { type: DataTypes.STRING(60), allowNull: false },
    hint: { type: DataTypes.STRING(100), allowNull: true },
    icon: { type: DataTypes.STRING(40), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: "payment_method_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id"] }],
});

export const DEFAULT_PAYMENT_METHODS = [
    { method_code: "upi", method_name: "UPI", hint: "Pay with any UPI app", icon: "fa-mobile-screen-button" },
    { method_code: "card", method_name: "Card", hint: "Debit or credit card", icon: "fa-credit-card" },
    { method_code: "cash", method_name: "Cash at the counter", hint: "The cashier will collect it", icon: "fa-money-bill-wave" },
];
