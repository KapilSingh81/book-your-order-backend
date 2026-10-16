import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

export const dishModel = dbConnect.define("dish_master", {
    pk_dish_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_category_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    is_veg: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    spicy_level: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, validate: { min: 0, max: 3 } },
    prep_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15 },
    is_bestseller: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // false = "Currently unavailable". Customer ko dikhta hai par order nahi ho sakta (server bhi rokta hai)
    is_available: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Upload ki hui photo ka file naam
    image_url: { type: DataTypes.STRING, allowNull: true },
    // Built-in illustration ka naam (photo upload na ho to)
    illustration: { type: DataTypes.STRING(60), allowNull: true },
    // Customer reviews abhi nahi hain, isliye ye seed/owner ke liye hain. votes 0 ho to card par star nahi dikhta
    rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false, defaultValue: 0 },
    votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: "dish_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id", "fk_category_id"] }],
});
