import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

/** Staff ke phone / laptop ka push address. Ek staff ke kai device ho sakte hain */
export const pushSubscriptionModel = dbConnect.define("push_subscription", {
    pk_push_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_staff_id: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.STRING(12), allowNull: false },
    endpoint: { type: DataTypes.TEXT, allowNull: false },
    p256dh: { type: DataTypes.STRING(200), allowNull: false },
    auth: { type: DataTypes.STRING(100), allowNull: false },
}, {
    tableName: "push_subscription",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id"] }, { fields: ["fk_staff_id"] }],
});
