from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    ProductListCreateView,
    ProductDetailView,
    LowStockProductView,
    ProductStockHistoryView,
    CategoryListCreateView,
    CategoryDetailView,
    SupplierListCreateView,
    SupplierDetailView,
    StockMovementListCreateView,
    RegisterView,
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderItemListView,
    SupplierPerformanceView,
    InventoryInsightsView,
)

from .copilot_views import (
    CopilotView,
)


urlpatterns = [

    # =====================================================
    # PRODUCTS
    # =====================================================

    path(
        "products/",
        ProductListCreateView.as_view(),
    ),

    path(
        "products/low-stock/",
        LowStockProductView.as_view(),
    ),

    path(
        "products/<int:pk>/",
        ProductDetailView.as_view(),
    ),

    path(
        "products/<int:product_id>/stock-history/",
        ProductStockHistoryView.as_view(),
    ),


    # =====================================================
    # CATEGORIES
    # =====================================================

    path(
        "categories/",
        CategoryListCreateView.as_view(),
    ),

    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
    ),


    # =====================================================
    # SUPPLIERS
    # =====================================================

    path(
        "suppliers/",
        SupplierListCreateView.as_view(),
    ),

    path(
        "suppliers/<int:pk>/",
        SupplierDetailView.as_view(),
    ),


    # =====================================================
    # STOCK MOVEMENTS
    # =====================================================

    path(
        "stock-movements/",
        StockMovementListCreateView.as_view(),
    ),


    # =====================================================
    # AUTHENTICATION
    # =====================================================

    path(
        "register/",
        RegisterView.as_view(),
    ),

    path(
        "login/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),


    # =====================================================
    # PURCHASE ORDERS
    # =====================================================

    path(
        "purchase-orders/",
        PurchaseOrderListCreateView.as_view(),
    ),

    path(
        "purchase-orders/<int:pk>/",
        PurchaseOrderDetailView.as_view(),
    ),

    path(
        "purchase-orders/<int:purchase_order_id>/items/",
        PurchaseOrderItemListView.as_view(),
    ),


    # =====================================================
    # INVENTORY INTELLIGENCE
    # =====================================================

    path(
        "inventory-insights/",
        InventoryInsightsView.as_view(),
    ),


    # =====================================================
    # SUPPLIER INTELLIGENCE
    # =====================================================

    path(
        "supplier-performance/",
        SupplierPerformanceView.as_view(),
    ),


    # =====================================================
    # AI COPILOT
    # =====================================================

    path(
        "copilot/",
        CopilotView.as_view(),
    ),

]