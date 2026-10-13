# Restro - Restaurant Management System

Restro is an integrated restaurant management system consisting of a Laravel REST API backend, a Next.js administrative dashboard and POS terminal, and a customer-facing frontend.

---

## Architecture Overview

The repository is structured as a monorepo containing three distinct applications:

* **backend**: Laravel application providing authentication, database models, business logic, and real-time broadcasting via Laravel Reverb.
* **dashboard**: Next.js application serving as the control panel, kitchen display system (KDS), and Point of Sale (POS) interface.
* **frontend**: Next.js client application for public menu browsing and customer interactions.

---

## Core Modules

* **Point of Sale (POS)**: Cashier interface supporting dine-in, takeaway, and delivery orders with split payments and receipt generation.
* **Menu Management**: Categorized menu catalog, multi-size pricing, add-ons/modifiers, and image management with paginated queries.
* **Table & Floor Management**: Real-time table occupancy status, seating capacity tracking, and order assignment.
* **Kitchen Display (KDS)**: Live order tracking for kitchen staff with status updates pushed over WebSockets.
* **Cash Registers**: Register opening/closing sessions, cash tracking, and shift balancing.
* **Customer & Financial Ledger**: Customer debt tracking, account balances, and financial transaction vouchers.
* **Delivery & Staff Management**: Role-based access control (Admin, Cashier, Kitchen, Waiter) and delivery driver assignments.

---

## Requirements

* PHP >= 8.2
* Composer
* Node.js >= 18.x
* npm >= 9.x
* SQLite or MySQL 8.0+

---

## Installation and Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
composer install

# Environment configuration
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations and seed default data
php artisan migrate --seed --seeder=AdminSeeder

# Start the API server
php artisan serve --port=8000
```

To run real-time event broadcasting, start the Reverb server in a separate terminal:

```bash
cd backend
php artisan reverb:start --port=8080
```

### 2. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local

# Start the development server
npm run dev
```

The dashboard will be accessible at `http://localhost:3000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local

# Start the development server
npm run dev -- -p 3001
```

The customer frontend will be accessible at `http://localhost:3001`.

---

## Default Credentials

The database seeder (`AdminSeeder`) initializes the following default accounts for testing:

| Role | Email | Password |
|---|---|---|
| Admin | admin@restro.com | Admin@2026! |
| Cashier | cashier@restro.com | Cashier@2026! |
| Kitchen | chef@restro.com | Chef@2026! |

---

## Environment Variables

### Backend (`backend/.env`)

* `APP_NAME`: Application name
* `APP_URL`: Base URL (default: `http://localhost:8000`)
* `DB_CONNECTION`: Database driver (`sqlite` or `mysql`)
* `BROADCAST_CONNECTION`: Set to `reverb` for live events
* `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`: Reverb WebSocket credentials

### Dashboard (`dashboard/.env.local`)

* `NEXT_PUBLIC_API_URL`: Backend API endpoint (default: `http://localhost:8000/api`)
* `NEXT_PUBLIC_REVERB_APP_KEY`: Reverb public key
* `NEXT_PUBLIC_REVERB_HOST`: Reverb host (default: `localhost`)
* `NEXT_PUBLIC_REVERB_PORT`: Reverb port (default: `8080`)
* `NEXT_PUBLIC_REVERB_SCHEME`: Reverb connection scheme (`http` or `https`)

---

## Project Structure

```
Restro/
├── backend/                  # Laravel API application
│   ├── app/                  # Application code (Controllers, Models, Events)
│   ├── database/             # Migrations and seeders
│   ├── routes/               # API and web route definitions
│   └── config/               # Application configuration
├── dashboard/                # Next.js Management & POS Dashboard
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # Reusable UI components
│   ├── store/                # Zustand global state stores
│   └── lib/                  # API client and utilities
├── frontend/                 # Next.js Public Client App
│   ├── app/                  # Customer-facing views
│   └── components/           # Client components
├── .gitignore                # Root Git ignore rules
└── README.md                 # Project documentation
```

---

## License

This software is private and proprietary unless explicitly stated otherwise.
