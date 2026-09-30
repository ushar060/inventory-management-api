# 📦 StockPilot — Inventory Management API

A full-stack inventory management platform built with **Django** and **Django REST Framework**, designed to help businesses manage products, suppliers, stock movements, purchase orders, and inventory intelligence from a centralized dashboard.

The project combines a **RESTful backend API**, **web-based operations dashboard**, and **inventory intelligence features** to demonstrate a production-style business application.

---

## 🚀 Live Demo

**Login:**  
https://inventory-management-api-q0x5.onrender.com/login/

**Swagger API Documentation:**  
https://inventory-management-api-q0x5.onrender.com/api/docs/

> The application is deployed on Render. Since it uses a free-tier instance, the first request after inactivity may take some time while the server wakes up.

---

## 🔐 Demo Access

Use the demo account to explore the application.

**Username:** `demo`  
**Password:** `demo1234`

**Login:**  
https://inventory-management-api-q0x5.onrender.com/login/

> The demo account is a regular user account and is not a superuser.

---

# 📌 Key Features

## 📦 Product Management

- Create, view, update, and delete products
- Unique SKU management
- Product pricing
- Inventory quantity tracking
- Low-stock threshold configuration
- Category association
- Supplier association
- Product search
- Category filtering
- Supplier filtering
- Low-stock identification

---

## 🗂️ Category Management

- Create categories
- View categories
- Update categories
- Delete categories
- Category descriptions

---

## 🚚 Supplier Management

- Create suppliers
- View suppliers
- Update suppliers
- Delete suppliers
- Supplier contact information
- Supplier performance analysis

---

## 📊 Stock Management

- Record stock-in movements
- Record stock-out movements
- Automatically update product quantities
- Prevent stock from becoming negative
- Maintain stock movement history
- View product-specific stock history

---

## 🧾 Purchase Order Management

- Create purchase orders
- Associate purchase orders with suppliers
- Add products to purchase orders
- Track ordered quantities
- Track received quantities
- Track pending quantities
- Monitor fulfillment rates
- Track expected delivery dates
- Track received dates
- Monitor purchase order status

### Purchase Order Statuses

- `PENDING`
- `PARTIAL`
- `RECEIVED`
- `CANCELLED`

---

# 🧠 Inventory Intelligence

StockPilot includes inventory analysis features designed to turn operational inventory data into actionable insights.

### Inventory Risk Analysis

The system analyzes:

- Current inventory levels
- Recent stock-out movements
- Average daily demand
- Days of stock remaining
- Stockout risk
- Risk scores
- Recommended reorder quantities

### Risk Levels

- **HEALTHY**
- **MEDIUM**
- **HIGH**
- **CRITICAL**

The system also provides an operational recommendation such as:

- No action required
- Monitor demand
- Review stock level
- Reorder soon
- Reorder immediately

---

# 📈 Supplier Performance

Supplier performance analytics include:

- Total purchase orders
- Completed purchase orders
- Late orders
- On-time delivery rate
- Average lead time
- Total ordered quantity
- Total received quantity
- Fulfillment rate
- Supplier health score
- Supplier risk level

Supplier risk levels are categorized as:

- `LOW`
- `MEDIUM`
- `HIGH`
- `NO DATA`

---

# 🤖 StockPilot Copilot

The project also includes an **AI-powered inventory assistant** designed to answer operational questions using StockPilot inventory data.

Example questions include:

```text
What should I reorder this week?

Which products are at highest risk?

Which purchase orders are overdue?

What should operations focus on today?