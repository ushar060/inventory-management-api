# Inventory Management API

A full-stack inventory management system built with **Django** and **Django REST Framework**.

The application provides a REST API for managing products, categories, suppliers, and stock movements. It also includes JWT authentication, low-stock tracking, stock history, role-based permissions, Swagger/OpenAPI documentation, and a responsive web dashboard.

## 🚀 Live Demo

**Login Page:**  
https://inventory-management-api-q0x5.onrender.com/login/

Use the login page to access the deployed inventory management dashboard.

> **Note:** The application is hosted on Render's free tier, so it may take a short time to wake up if it has been inactive.

---

## 📌 Features

- JWT-based authentication
- User registration and login
- Product CRUD operations
- Category CRUD operations
- Supplier CRUD operations
- Stock-in and stock-out management
- Automatic inventory quantity updates
- Stock movement history
- Low-stock detection
- Product search and filtering
- Pagination
- Role-based permissions
- Swagger/OpenAPI API documentation
- Responsive Bootstrap dashboard
- PostgreSQL database
- Production deployment with Render
- Gunicorn application server
- WhiteNoise static file handling

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
- OpenAPI
- Swagger UI

### Frontend

- HTML
- CSS
- Bootstrap
- JavaScript

### Deployment

- Render
- Gunicorn
- WhiteNoise

---

## 🏗️ Project Structure

```text
inventory-management-api/
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── inventory/
│   ├── migrations/
│   ├── static/
│   ├── templates/
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
├── requirements.txt
└── README.md