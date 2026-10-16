import { hotelModel } from "./hotelModel.js";
import { roleModel } from "./roleModel.js";
import { staffModel } from "./staffModel.js";
import { categoryModel } from "./categoryModel.js";
import { dishModel } from "./dishModel.js";
import { dishPortionModel } from "./dishPortionModel.js";
import { tableModel, tableSessionModel, guestModel } from "./tableModel.js";
import { orderModel, orderItemModel } from "./orderModel.js";
import { billModel } from "./billModel.js";
import { alertModel } from "./alertModel.js";
import { paymentMethodModel } from "./paymentMethodModel.js";
import { pushSubscriptionModel } from "./pushModel.js";

// constraints: false -> purane data ke saath sync({ alter }) me FK error nahi aata, check controllers me hota hai
const fk = (name, extra = {}) => ({ foreignKey: name, constraints: false, ...extra });

staffModel.belongsTo(roleModel, fk("fk_role_id", { as: "role", targetKey: "id" }));
staffModel.belongsTo(hotelModel, fk("fk_hotel_id", { as: "hotel" }));

categoryModel.hasMany(dishModel, fk("fk_category_id", { as: "dishes" }));
dishModel.belongsTo(categoryModel, fk("fk_category_id", { as: "category" }));
dishModel.hasMany(dishPortionModel, fk("fk_dish_id", { as: "portions" }));
dishPortionModel.belongsTo(dishModel, fk("fk_dish_id", { as: "dish" }));

tableModel.hasMany(tableSessionModel, fk("fk_table_id", { as: "sessions" }));
tableSessionModel.belongsTo(tableModel, fk("fk_table_id", { as: "table" }));
tableSessionModel.hasMany(guestModel, fk("fk_session_id", { as: "guests" }));
guestModel.belongsTo(tableSessionModel, fk("fk_session_id", { as: "session" }));

orderModel.belongsTo(tableModel, fk("fk_table_id", { as: "table" }));
orderModel.belongsTo(guestModel, fk("fk_guest_id", { as: "guest" }));
orderModel.hasMany(orderItemModel, fk("fk_order_id", { as: "items" }));
orderItemModel.belongsTo(orderModel, fk("fk_order_id", { as: "order" }));

billModel.belongsTo(tableModel, fk("fk_table_id", { as: "table" }));
billModel.hasMany(orderModel, fk("fk_bill_id", { as: "orders" }));
alertModel.belongsTo(tableModel, fk("fk_table_id", { as: "table" }));

export {
    hotelModel, roleModel, staffModel, categoryModel, dishModel, dishPortionModel,
    tableModel, tableSessionModel, guestModel, orderModel, orderItemModel,
    billModel, alertModel, paymentMethodModel, pushSubscriptionModel,
};
