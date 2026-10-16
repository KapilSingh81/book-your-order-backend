import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

/** Customer ka "waiter bulao" / "bill chahiye" */
export const alertModel = dbConnect.define("staff_alert", {
    pk_alert_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_table_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_session_id: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [["waiter", "bill"]] } },
    guest_name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: "" },
    is_done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    done_at: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: "staff_alert",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id", "is_done"] }],
});
