import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { dbConnect } from "./config/db.config.js";
import { swaggerSpec } from "./config/swagger.config.js";
import "./model/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { seedRoles } from "./seed/roles.js";
import authRouter from "./routes/authRoutes.js";
import hotelRouter from "./routes/hotelRoutes.js";
import roleRouter from "./routes/roleRoutes.js";
import staffRouter from "./routes/staffRoutes.js";
import categoryRouter from "./routes/categoryRoutes.js";
import dishRouter from "./routes/dishRoutes.js";
import dishPortionRouter from "./routes/dishPortionRoutes.js";
import tableRouter from "./routes/tableRoutes.js";
import paymentMethodRouter from "./routes/paymentMethodRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import billRouter from "./routes/billRoutes.js";
import alertRouter from "./routes/alertRoutes.js";
import publicRouter from "./routes/publicRoutes.js";
import pushRouter from "./routes/pushRoutes.js";
import { initPush, checkStaleOrders } from "./services/push.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing in .env");
    process.exit(1);
}

const app = express();

const origins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : {}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Express 5 me body na ho to req.body undefined hota hai
app.use((req, res, next) => { req.body ??= {}; next(); });

app.use("/uploads", express.static("uploads"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/", (req, res) => res.send("Welcome to the Book Your Order API"));

app.use("/api/auth", authRouter);
app.use("/api/hotel", hotelRouter);
app.use("/api/role", roleRouter);
app.use("/api/staff", staffRouter);
app.use("/api/category", categoryRouter);
app.use("/api/dish", dishRouter);
app.use("/api/dish-portion", dishPortionRouter);
app.use("/api/table", tableRouter);
app.use("/api/payment-method", paymentMethodRouter);
app.use("/api/order", orderRouter);
app.use("/api/bill", billRouter);
app.use("/api/alert", alertRouter);
app.use("/api/push", pushRouter);
app.use("/api/public", publicRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

try {
    await dbConnect.authenticate();
    // Production me sync(alter) ki jagah migrations use karo
    await dbConnect.sync({ alter: String(process.env.DB_SYNC_ALTER ?? "true") === "true" });
    console.log("Database synced");
    await seedRoles();
    initPush();
    setInterval(() => checkStaleOrders().catch((e) => console.log("stale check:", e.message)), 30_000);
    app.listen(PORT, () => console.log(`Server is running at http://localhost:${PORT}`));
} catch (err) {
    console.error("Database error:", err.message);
    process.exit(1);
}
