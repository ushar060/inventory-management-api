# Inventory Management API

A RESTful inventory management backend built with Django and Django REST Framework.

The API provides product, category, supplier, and stock management functionality with JWT authentication, role-based permissions, search, filtering, pagination, low-stock detection, stock history, and interactive Swagger documentation.

## Features

- Product CRUD operations
- Category CRUD operations
- Supplier CRUD operations
- Stock IN and Stock OUT management
- Automatic product quantity updates
- Stock movement history
- Low-stock detection
- Product search by name and SKU
- Filtering by category and supplier
- Low-stock filtering
- API pagination
- User registration
- JWT authentication
- Role-based permissions
- Swagger/OpenAPI documentation
- SQLite for local development
- PostgreSQL-ready configuration

## Tech Stack

- Python
- Django
- Django REST Framework
- Simple JWT
- PostgreSQL
- SQLite
- drf-spectacular
- python-decouple

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register/` | Register a new user |
| POST | `/api/login/` | Obtain JWT access and refresh tokens |
| POST | `/api/token/refresh/` | Refresh an access token |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products/` | List products |
| POST | `/api/products/` | Create a product |
| GET | `/api/products/{id}/` | Retrieve a product |
| PUT/PATCH | `/api/products/{id}/` | Update a product |
| DELETE | `/api/products/{id}/` | Delete a product |
| GET | `/api/products/low-stock/` | List low-stock products |
| GET | `/api/products/{id}/stock-history/` | View product stock history |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories/` | List categories |
| POST | `/api/categories/` | Create a category |
| GET | `/api/categories/{id}/` | Retrieve a category |
| PUT/PATCH | `/api/categories/{id}/` | Update a category |
| DELETE | `/api/categories/{id}/` | Delete a category |

### Suppliers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/suppliers/` | List suppliers |
| POST | `/api/suppliers/` | Create a supplier |
| GET | `/api/suppliers/{id}/` | Retrieve a supplier |
| PUT/PATCH | `/api/suppliers/{id}/` | Update a supplier |
| DELETE | `/api/suppliers/{id}/` | Delete a supplier |

### Stock Movements

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stock-movements/` | List stock movements |
| POST | `/api/stock-movements/` | Create a stock movement |

## Search and Filtering

Products can be searched and filtered using query parameters.

### Search by product name or SKU

```text
/api/products/?search=laptop