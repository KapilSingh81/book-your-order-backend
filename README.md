# Book Your Order - backend

Node (ESM) + Express 5 + Sequelize + PostgreSQL. Swagger: `http://localhost:8000/api-docs`

## Run
```
npm install
cp .env.example .env      # DB aur JWT_SECRET bharo
npm run seed              # roles + demo hotel (Hotel Sunrise, menu, 12 tables, 3 logins)
npm run serve
```
Demo logins (seed): owner@hotelsunrise.in / Owner@123, counter@hotelsunrise.in / Counter@123, kitchen@hotelsunrise.in / Kitchen@123

## Flow
- Login `POST /api/auth/login` -> JWT. Har staff API me `Authorization: Bearer <token>`. Hotel hamesha token se aata hai, body se nahi.
- Naya hotel: `POST /api/auth/register-hotel` (owner login ke saath).
- Customer (login nahi): `/api/public/:slug/menu`, `/table/:n?k=`, `/order`, `/alert`. QR ka secret `k` server par check hota hai (`REQUIRE_QR_TOKEN`).
- Order status sirf 3: `placed -> preparing -> served` (`PATCH /api/order/status/:id`).
- Dish `is_available=false` => customer ko "Currently unavailable", aur order bhejne par server 409 deta hai.
- Bill: `POST /api/bill/pay` (guest_id do to us guest ka alag bill, na do to poore table ka). Bill number `YYYY-seq` har hotel ka alag.
- Table khali: `POST /api/table/close/:id`.

## Roles
owner: sab kuch | counter: orders, payment, table close | kitchen: orders, dish availability

## Notes
- `DB_SYNC_ALTER=true` sirf development ke liye. Production me migrations.
- `hotel_masters` table ka naam purane code jaisa hi rakha hai. Naye columns: tax_rate, order_seq, bill_seq.
- Rate limit chhota in-memory hai (public routes). Bade deployment me redis based limiter lagao.

## Notifications, offline orders and location check

- **Retry safe orders**: the phone sends a `request_id` with every order. Sending it again (bad network) returns the same order, never a second one.
- **"Hotel received it"**: when counter/kitchen opens their screen, placed orders get `seen=true`; the customer sees "The hotel has received your order". If not seen for 2 min the customer gets a "Call a waiter" button.
- **Push to staff**: set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in `.env` (`npx web-push generate-vapid-keys`, generate your own for production). New order, waiter call, bill request, and an order stuck in "placed" for `STALE_ORDER_MIN` minutes all notify counter/kitchen/owner devices. Push needs the production build served over HTTPS.
- **Location check** (Hotel page, owner): `off` / `warn` (ticket shows "Outside hotel") / `block` (order refused). The phone's location is read only when ordering.
- **Remove order**: `POST /api/order/void/:id` while the order is still "placed". Never billed; customer sees "cancelled by the hotel".
- New DB columns are created by `sync({alter})`; in production add them with a migration.
