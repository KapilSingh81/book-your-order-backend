import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const tableModel = dbConnect.define("table_master", {
    pk_table_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    table_number: { type: DataTypes.INTEGER, allowNull: false },
    table_label: { type: DataTypes.STRING(40), allowNull: true },
    seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    // QR link ka secret hissa. Naya banao to purana chhapa hua QR kaam karna band kar deta hai
    qr_token: { type: DataTypes.STRING(40), allowNull: false },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: "table_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id", "table_number"] }],
});

/** Ek table par ek time me ek hi open session hota hai. Table close hone par session band, agle guests ka naya session */
export const tableSessionModel = dbConnect.define("table_session", {
    pk_session_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_table_id: { type: DataTypes.INTEGER, allowNull: false },
    closed_at: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: "table_session",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_table_id", "closed_at"] }, { fields: ["fk_hotel_id"] }],
});

/** Table par baitha har insaan (har phone ek guest) */
export const guestModel = dbConnect.define("guest_master", {
    pk_guest_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_session_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.STRING(64), allowNull: false },
    guest_name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: "" },
    seat: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: "guest_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["fk_session_id", "client_id"] }],
});
