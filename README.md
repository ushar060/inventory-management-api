# 📦 Inventory Management API

A full-stack inventory management system built with **Django** and **Django REST Framework**.

The application provides a RESTful API for managing products, categories, suppliers, stock movements, and low-stock inventory, along with a web-based dashboard for managing the inventory.

## 🚀 Live Demo

**Login Page:**  
https://inventory-management-api-q0x5.onrender.com/login/

**API Documentation (Swagger):**  
https://inventory-management-api-q0x5.onrender.com/api/docs/

> The application is deployed on Render. Since it uses a free-tier instance, the first request after inactivity may take some time while the server wakes up.

---

## 🔐 Demo Access

Use the demo account to explore the deployed application.

**Username:** `demo`  
**Password:** `demo1234`

**Login:**  
https://inventory-management-api-q0x5.onrender.com/login/

> The demo account is a regular user account and is not a superuser.

---

## 📌 Features

### Product Management
- Create, view, update, and delete products
- Product SKU management
- Product pricing
- Stock quantity tracking
- Minimum stock threshold
- Category and supplier association
- Product search
- Filter products by category
- Filter products by supplier
- Identify low-stock products

### Category Management
- Create categories
- View categories
- Update categories
- Delete categories

### Supplier Management
- Create suppliers
- View suppliers
- Update suppliers
- Delete suppliers

### Stock Management
- Record stock-in movements
- Record stock-out movements
- Automatically update product stock quantities
- Prevent stock from becoming negative
- Maintain stock movement history
- View stock history for individual products

### Authentication & Authorization
- User registration
- JWT-based authentication
- JWT token refresh
- Protected API endpoints
- Staff-based permissions for inventory modifications
- Read-only access for unauthenticated users where applicable

### Dashboard
- Inventory overview
- Total product count
- Low-stock product count
- Product management interface
- Category management
- Supplier management
- Stock movement management

### API Documentation
- Interactive Swagger API documentation
- OpenAPI schema
- JWT authentication support

---

## 🛠️ Tech Stack

### Backend
- Python
- Django
- Django REST Framework
- Simple JWT

### Database
- PostgreSQL

### API Documentation
- drf-spectacular
- Swagger UI
- OpenAPI

### Frontend
- HTML
- CSS
- Bootstrap
- JavaScript

### Deployment
- Render
- Gunicorn
- WhiteNoise

### Configuration
- python-decouple
- dj-database-url

---

## 🏗️ Project Structure

```text
Inventory Management Django/
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── inventory/
│   ├── migrations/
│   ├── templates/
│   │   └── inventory/
│   ├── static/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── permissions.py
│   ├── serializers.py
│   ├── urls.py
│   └── views.py
│
├── .gitignore
├── build.sh
├── manage.py
├── README.md
└── requirements.txt