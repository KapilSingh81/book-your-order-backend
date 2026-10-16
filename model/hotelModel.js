import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const hotelModel = dbConnect.define("hotel_master", {
    pk_hotel_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hotel_name: { type: DataTypes.STRING, allowNull: false },
    phone_number: { type: DataTypes.STRING, allowNull: false },
    logo: { type: DataTypes.STRING, allowNull: true },
    GSTIN: { type: DataTypes.STRING, allowNull: true },
    hotel_address: { type: DataTypes.STRING, allowNull: false },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // QR me chhapta hai, isliye banne ke baad kabhi nahi badalta
    hotel_slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    tagline: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    // Total GST, bill me CGST + SGST me barabar bat jata hai. 0.05 = 5%
    tax_rate: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0.05 },
    // Location guard: hotel ke andar baithe customer hi order kar saken. off = band, warn = order aata hai par "location door" ka nishan lagta hai, block = order nahi jata
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    geo_radius_m: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 150 },
    geo_mode: { type: DataTypes.STRING(6), allowNull: false, defaultValue: "off", validate: { isIn: [["off", "warn", "block"]] } },
    // Order / bill number ke counters (har hotel ke apne)
    order_seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
    bill_seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
}, {
    // tableName jaan boojh kar nahi diya: pehle ki tarah "hotel_masters" hi rahe, purana data na chhute
    timestamps: true,
});
