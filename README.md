# Savoria - Modern Restaurant Management System (Client Side)

A modern, full-featured restaurant web application and real-time dashboard built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Socket.IO**.

## Features

- **Public Customer Portal**:
  - Interactive Landing Page with Hero, Featured Menu, Special Offers, and Customer Testimonials
  - Real-time Menu browsing with Category filtering and search
  - Online Table Reservation with interactive date/time slot picker
  - Shopping Cart, Takeaway / Delivery options, and Checkout
  - Live Order Tracking with status timeline (Placed, Preparing, Ready, Served/Delivered)
  - User Authentication (Login, Register, Forgot Password, Profile)

- **Comprehensive Staff & Management Dashboard**:
  - **POS / Cashier System**: Fast item selection, seat/table assignment, tax and discount calculation, receipt generation
  - **Live Kitchen Display (KDS)**: Real-time Kanban preparation board with New, Preparing, and Ready stages
  - **Dedicated Kitchen Sub-Panels**: Served to Table history, Takeaway Handover, and Delivery tracking
  - **Waiters Panel**: Real-time ready dish claim and mark-as-served workflow
  - **Delivery Portal**: Active delivery tracking, rider assignment, out-for-delivery, and delivery completion
  - **Tables & Seats Management**: Visual floor plan layout, occupancy status (Available, Occupied, Reserved, Cleaning)
  - **Menu Management**: Categorized food item CRUD, pricing, descriptions, and modifiers
  - **Inventory & Suppliers**: Stock tracking, low-stock warnings, purchase orders, and supplier directory
  - **Staff Management**: Role-based access control (Admin, Manager, Cashier, Waiter, Kitchen, Delivery, Customer)
  - **Reports & Analytics**: Daily sales, order volume, revenue breakdown, and audit logging
  - **Real-Time Notifications**: Instant Socket.IO notifications for all order lifecycle events

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Real-Time Communication**: Socket.IO Client
- **State & Notifications**: Sonner, Custom Hooks, LocalStorage

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
