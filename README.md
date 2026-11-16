# Kaah Steel Props — Rental & Business Management System

Full-stack, responsive web app based on the Steel Prop specification and the Kaah screenshots.
Somali (default) and English. Charcoal / Orange design.

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Lucide icons
- **Backend:** Node.js + Express + Mongoose (MongoDB Atlas)
- **Auth:** JWT + bcrypt, role-based permissions checked on the server

## Features

| Module | What it does |
|---|---|
| Dashboard | Totals, rentals active/overdue, returns due in 7 days, low stock, profit |
| Inventory | Products with total / available / rented / sold / damaged / lost; restock |
| Customers | Customer records with billed, paid and balance |
| Rentals & Returns | Multi-line rentals, live cost preview, partial and full returns |
| Invoices | Rental invoices and sales; filter unpaid / paid |
| Payments | Record cash / bank / mobile payments; cannot exceed the balance |
| Finance | Expenses, damage & loss (with resolve), CSV reports |
| Users & Settings | Admin creates users, sets roles, enables/disables; company settings |

## Business rules enforced on the server

- Available stock can never go negative. Stock changes are atomic (`updateOne` with `available >= qty`).
- Rentals reserve stock per line; if one line fails, the others are rolled back.
- Rental billing: `qty × daily rate × days`, per return event. Units returned early are billed only up to the return date. Units still out are billed to the expected end (or today if overdue). Days = end − start, minimum 1.
- Partial return: good units go back to available; damaged units go to damaged stock, not available.
- Payments cannot exceed the balance.
- Invoices and payments have no delete endpoint (audit trail is kept in `AuditLog`).
- Damage cost is automatically booked as a repair expense.

## Run locally

Requirements: Node.js 18+ and a MongoDB Atlas cluster (or local MongoDB).

```bash
# 1. Backend
cd server
cp .env.example .env        # fill MONGODB_URI and JWT_SECRET
npm install
npm run seed                # creates the admin account + sample products (run once)
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`. Change the password after the first login (Users page).

## Deploy

- **Backend:** Render, Railway or any Node host. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (your frontend URL).
- **Frontend:** Vercel or Netlify. Build command `npm run build`, output `dist`. Set `VITE_API_URL` to your backend URL + `/api`.
- Use MongoDB Atlas automated backups for the "daily backup" requirement.

## Not included yet (next steps)

- PDF invoices/receipts (the spec asks for PDF download and print). Planned with a PDF library on the server.
- Barcode / QR codes, warehouse transfers, customer self-service portal, email/SMS notifications.
- SOS currency conversion (amounts are stored in USD; currency field is kept for future use).
- Automated tests.
