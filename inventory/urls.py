from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    ProductListCreateView,
    ProductDetailView,
    CategoryListCreateView,
    CategoryDetailView,
    SupplierListCreateView,
    SupplierDetailView,
    LowStockProductView,
    StockMovementListCreateView,
    ProductStockHistoryView,
    RegisterView,
)


urlpatterns = [

    # Products
    path(
        "products/",
        ProductListCreateView.as_view()
    ),

    path(
        "products/low-stock/",
        LowStockProductView.as_view()
    ),

    path(
        "products/<int:pk>/",
        ProductDetailView.as_view()
    ),

    path(
        "products/<int:pk>/stock-history/",
        ProductStockHistoryView.as_view()
    ),


    # Categories
    path(
        "categories/",
        CategoryListCreateView.as_view()
    ),

    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view()
    ),


    # Suppliers
    path(
        "suppliers/",
        SupplierListCreateView.as_view()
    ),

    path(
        "suppliers/<int:pk>/",
        SupplierDetailView.as_view()
    ),


    # Stock movements
    path(
        "stock-movements/",
        StockMovementListCreateView.as_view()
    ),


    # Authentication API
    path(
        "register/",
        RegisterView.as_view()
    ),

    path(
        "login/",
        TokenObtainPairView.as_view()
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view()
    ),
]