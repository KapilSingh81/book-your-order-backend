import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

/** Dish ka size aur uska price, jaise Half 150 / Full 300 ya 1 pc 55 / 6 pcs 300 */
export const dishPortionModel = dbConnect.define("dish_portion_master", {
    pk_portion_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_dish_id: { type: DataTypes.INTEGER, allowNull: false },
    portion_label: { type: DataTypes.STRING(40), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: "dish_portion_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_dish_id"] }],
});
