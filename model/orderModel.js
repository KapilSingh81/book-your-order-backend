import { DataTypes } from "sequelize";
import { dbConnect } from "../config/db.config.js";

/** Sirf teen status: placed (order aaya) -> preparing -> served */
export const ORDER_STATUS = ["placed", "preparing", "served"];

export const orderModel = dbConnect.define("order_master", {
    pk_order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_no: { type: DataTypes.INTEGER, allowNull: false },
    fk_hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_table_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_session_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_guest_id: { type: DataTypes.INTEGER, allowNull: false },
    round: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    note: { type: DataTypes.STRING(200), allowNull: true },
    status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "placed", validate: { isIn: [ORDER_STATUS] } },
    status_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    via_qr: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Phone ek hi order do baar bheje (retry / network toot jaye) to bhi order ek hi bane
    client_request_id: { type: DataTypes.STRING(64), allowNull: true },
    // Counter / kitchen ne jab pehli baar ye order apni screen par dekha
    seen_at: { type: DataTypes.DATE, allowNull: true },
    // "Kitni der se koi nahi dekh raha" ka push ek hi baar jaye
    stale_notified_at: { type: DataTypes.DATE, allowNull: true },
    // Customer ki location: na (check band) / ok / outside (hotel se door) / unknown (location nahi mili)
    geo_state: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "na" },
    geo_distance_m: { type: DataTypes.INTEGER, allowNull: true },
    // Counter ne order hata diya (galat / hotel ke bahar se / duplicate). Bill me nahi judta
    is_void: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    void_reason: { type: DataTypes.STRING(120), allowNull: true },
    // Bill banne par bhar jata hai
    fk_bill_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: "order_master",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["fk_hotel_id", "client_request_id"], unique: true }, { fields: ["fk_hotel_id", "status"] }, { fields: ["fk_session_id"] }, { fields: ["fk_hotel_id", "order_no"] }],
});

/** Order ke waqt ka snapshot: baad me dish ka naam ya price badle to purana bill nahi badalta */
export const orderItemModel = dbConnect.define("order_item", {
    pk_item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_order_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_dish_id: { type: DataTypes.INTEGER, allowNull: false },
    fk_portion_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_name: { type: DataTypes.STRING(120), allowNull: false },
    portion_label: { type: DataTypes.STRING(40), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    qty: { type: DataTypes.INTEGER, allowNull: false },
    is_veg: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: "order_item",
    freezeTableName: true,
    timestamps: false,
    indexes: [{ fields: ["fk_order_id"] }],
});
