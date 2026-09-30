from datetime import timedelta

from django.db import models, transaction
from django.shortcuts import render
from django.utils import timezone

from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Product,
    Category,
    Supplier,
    StockMovement,
    PurchaseOrder,
    PurchaseOrderItem,
)

from .serializers import (
    ProductSerializer,
    CategorySerializer,
    SupplierSerializer,
    StockMovementSerializer,
    RegisterSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderItemSerializer,
)

from .permissions import IsStaffOrReadOnly


# =========================================================
# PRODUCTS
# =========================================================

class ProductListCreateView(generics.ListCreateAPIView):

    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        queryset = Product.objects.select_related(
            "category",
            "supplier"
        ).all()

        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        supplier = self.request.query_params.get("supplier")
        low_stock = self.request.query_params.get("low_stock")

        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search)
                | models.Q(sku__icontains=search)
                | models.Q(category__name__icontains=search)
            )

        if category:
            queryset = queryset.filter(
                category_id=category
            )

        if supplier:
            queryset = queryset.filter(
                supplier_id=supplier
            )

        if low_stock == "true":
            queryset = queryset.filter(
                quantity__lte=models.F(
                    "low_stock_threshold"
                )
            )

        return queryset.order_by("name")


class ProductDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Product.objects.select_related(
        "category",
        "supplier"
    ).all()

    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]


# =========================================================
# CATEGORIES
# =========================================================

class CategoryListCreateView(
    generics.ListCreateAPIView
):

    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]


class CategoryDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]


# =========================================================
# SUPPLIERS
# =========================================================

class SupplierListCreateView(
    generics.ListCreateAPIView
):

    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [IsStaffOrReadOnly]


class SupplierDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsStaffOrReadOnly]


# =========================================================
# LOW STOCK
# =========================================================

class LowStockProductView(
    generics.ListAPIView
):

    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        return Product.objects.filter(
            quantity__lte=models.F(
                "low_stock_threshold"
            )
        ).select_related(
            "category",
            "supplier"
        )


# =========================================================
# STOCK MOVEMENTS
# =========================================================

class StockMovementListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = StockMovementSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        return (
            StockMovement.objects
            .select_related("product")
            .all()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):

        with transaction.atomic():

            movement = serializer.save()

            product = movement.product

            if movement.movement_type == "IN":

                product.quantity += movement.quantity

            elif movement.movement_type == "OUT":

                if movement.quantity > product.quantity:

                    raise serializers.ValidationError(
                        {
                            "quantity": (
                                "Not enough stock available."
                            )
                        }
                    )

                product.quantity -= movement.quantity

            product.save(
                update_fields=["quantity"]
            )


# =========================================================
# PRODUCT STOCK HISTORY
# =========================================================

class ProductStockHistoryView(
    generics.ListAPIView
):

    serializer_class = StockMovementSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        product_id = self.kwargs["pk"]

        return (
            StockMovement.objects
            .select_related("product")
            .filter(
                product_id=product_id
            )
            .order_by("-created_at")
        )


# =========================================================
# PURCHASE ORDERS
# =========================================================

class PurchaseOrderListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        queryset = (
            PurchaseOrder.objects
            .select_related("supplier")
            .prefetch_related(
                "items__product"
            )
            .all()
            .order_by("-created_at")
        )

        supplier = self.request.query_params.get(
            "supplier"
        )

        status = self.request.query_params.get(
            "status"
        )

        search = self.request.query_params.get(
            "search"
        )

        if supplier:

            queryset = queryset.filter(
                supplier_id=supplier
            )

        if status:

            queryset = queryset.filter(
                status=status.upper()
            )

        if search:

            queryset = queryset.filter(
                models.Q(
                    order_number__icontains=search
                )
                | models.Q(
                    supplier__name__icontains=search
                )
            )

        return queryset


class PurchaseOrderDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        return (
            PurchaseOrder.objects
            .select_related("supplier")
            .prefetch_related(
                "items__product"
            )
            .all()
        )


# =========================================================
# PURCHASE ORDER ITEMS
# =========================================================

class PurchaseOrderItemListView(
    generics.ListAPIView
):

    serializer_class = PurchaseOrderItemSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):

        purchase_order_id = self.kwargs[
            "purchase_order_id"
        ]

        return (
            PurchaseOrderItem.objects
            .select_related(
                "product",
                "purchase_order"
            )
            .filter(
                purchase_order_id=purchase_order_id
            )
            .order_by("id")
        )


# =========================================================
# SUPPLIER PERFORMANCE
# =========================================================

class SupplierPerformanceView(
    generics.ListAPIView
):

    queryset = Supplier.objects.all()

    permission_classes = [IsStaffOrReadOnly]

    def list(
        self,
        request,
        *args,
        **kwargs
    ):

        suppliers = Supplier.objects.all()

        performance = []

        for supplier in suppliers:

            purchase_orders = (
                PurchaseOrder.objects
                .filter(
                    supplier=supplier
                )
                .prefetch_related("items")
            )

            total_orders = purchase_orders.count()

            completed_orders = purchase_orders.filter(
                status=PurchaseOrder.STATUS_RECEIVED
            )

            completed_order_count = (
                completed_orders.count()
            )

            total_ordered_quantity = 0
            total_received_quantity = 0

            lead_times = []
            late_orders = 0

            # -------------------------------------------------
            # PURCHASE ORDER ANALYSIS
            # -------------------------------------------------

            for purchase_order in purchase_orders:

                items = purchase_order.items.all()

                ordered_quantity = sum(
                    item.quantity
                    for item in items
                )

                received_quantity = sum(
                    item.received_quantity
                    for item in items
                )

                total_ordered_quantity += (
                    ordered_quantity
                )

                total_received_quantity += (
                    received_quantity
                )

                # -------------------------------------------------
                # LEAD TIME
                # -------------------------------------------------

                if (
                    purchase_order.received_at
                    and purchase_order.ordered_at
                ):

                    lead_time = (
                        purchase_order.received_at.date()
                        - purchase_order.ordered_at.date()
                    ).days

                    if lead_time >= 0:

                        lead_times.append(
                            lead_time
                        )

                # -------------------------------------------------
                # LATE DELIVERY
                # -------------------------------------------------

                if (
                    purchase_order.expected_delivery
                    and purchase_order.received_at
                ):

                    if (
                        purchase_order.received_at.date()
                        > purchase_order.expected_delivery
                    ):

                        late_orders += 1

            # -------------------------------------------------
            # FULFILLMENT RATE
            # -------------------------------------------------

            if total_ordered_quantity > 0:

                fulfillment_rate = round(
                    (
                        total_received_quantity
                        / total_ordered_quantity
                    ) * 100,
                    2
                )

            else:

                fulfillment_rate = 0

            # -------------------------------------------------
            # ON-TIME DELIVERY
            # -------------------------------------------------

            if completed_order_count > 0:

                on_time_orders = max(
                    0,
                    completed_order_count
                    - late_orders
                )

                on_time_delivery_rate = round(
                    (
                        on_time_orders
                        / completed_order_count
                    ) * 100,
                    2
                )

            else:

                on_time_delivery_rate = 0

            # -------------------------------------------------
            # AVERAGE LEAD TIME
            # -------------------------------------------------

            if lead_times:

                average_lead_time = round(
                    sum(lead_times)
                    / len(lead_times),
                    1
                )

            else:

                average_lead_time = None

            # -------------------------------------------------
            # HEALTH SCORE
            # -------------------------------------------------

            if total_orders == 0:

                health_score = 0
                supplier_risk = "NO DATA"

            else:

                health_score = round(
                    (
                        on_time_delivery_rate * 0.5
                    )
                    + (
                        fulfillment_rate * 0.5
                    )
                )

                if health_score >= 90:

                    supplier_risk = "LOW"

                elif health_score >= 70:

                    supplier_risk = "MEDIUM"

                else:

                    supplier_risk = "HIGH"

            performance.append({

                "supplier_id": supplier.id,

                "supplier_name": supplier.name,

                "total_orders": total_orders,

                "completed_orders": (
                    completed_order_count
                ),

                "late_orders": late_orders,

                "on_time_delivery_rate": (
                    on_time_delivery_rate
                ),

                "average_lead_time_days": (
                    average_lead_time
                ),

                "total_ordered_quantity": (
                    total_ordered_quantity
                ),

                "total_received_quantity": (
                    total_received_quantity
                ),

                "fulfillment_rate": (
                    fulfillment_rate
                ),

                "health_score": health_score,

                "risk_level": supplier_risk,
            })

        return Response(performance)


# =========================================================
# AUTHENTICATION
# =========================================================

class RegisterView(
    generics.CreateAPIView
):

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# =========================================================
# INVENTORY INTELLIGENCE
# =========================================================

class InventoryInsightsView(
    generics.ListAPIView
):

    queryset = Product.objects.all()

    permission_classes = [IsStaffOrReadOnly]

    def list(
        self,
        request,
        *args,
        **kwargs
    ):

        products = (
            Product.objects
            .select_related(
                "supplier",
                "category"
            )
            .all()
        )

        thirty_days_ago = (
            timezone.now()
            - timedelta(days=30)
        )

        insights = []

        for product in products:

            current_stock = product.quantity

            threshold = (
                product.low_stock_threshold
            )

            # -------------------------------------------------
            # DEMAND
            # -------------------------------------------------

            stock_out_movements = (
                StockMovement.objects
                .filter(
                    product=product,
                    movement_type="OUT",
                    created_at__gte=thirty_days_ago
                )
            )

            total_units_sold = sum(
                movement.quantity
                for movement in stock_out_movements
            )

            average_daily_demand = (
                total_units_sold / 30
            )

            # -------------------------------------------------
            # STOCK COVERAGE
            # -------------------------------------------------

            if average_daily_demand > 0:

                days_of_stock = (
                    current_stock
                    / average_daily_demand
                )

            else:

                days_of_stock = None

            # -------------------------------------------------
            # RISK
            # -------------------------------------------------

            if current_stock == 0:

                risk_level = "CRITICAL"
                risk_score = 100
                action = "Reorder immediately"

            elif average_daily_demand == 0:

                if current_stock <= threshold:

                    risk_level = "MEDIUM"
                    risk_score = 50
                    action = "Review stock level"

                else:

                    risk_level = "HEALTHY"
                    risk_score = 0
                    action = "No action required"

            elif days_of_stock <= 3:

                risk_level = "CRITICAL"
                risk_score = 90
                action = "Reorder immediately"

            elif days_of_stock <= 7:

                risk_level = "HIGH"
                risk_score = 70
                action = "Reorder soon"

            elif days_of_stock <= 14:

                risk_level = "MEDIUM"
                risk_score = 40
                action = "Monitor demand"

            else:

                risk_level = "HEALTHY"
                risk_score = 10
                action = "No action required"

            # -------------------------------------------------
            # REORDER QUANTITY
            # -------------------------------------------------

            if average_daily_demand > 0:

                target_days = 30

                recommended_stock = (
                    average_daily_demand
                    * target_days
                )

                recommended_reorder_quantity = max(
                    0,
                    round(
                        recommended_stock
                        - current_stock
                    )
                )

            else:

                recommended_reorder_quantity = 0

            # -------------------------------------------------
            # EXPLANATION
            # -------------------------------------------------

            if days_of_stock is not None:

                explanation = (
                    f"{current_stock} units remaining. "
                    f"Average demand is "
                    f"{average_daily_demand:.1f} "
                    f"units/day, leaving approximately "
                    f"{days_of_stock:.1f} days of stock."
                )

            else:

                explanation = (
                    f"{current_stock} units currently "
                    f"in stock. No recent stock-out "
                    f"demand was recorded."
                )

            insights.append({

                "product_id": product.id,

                "product_name": product.name,

                "sku": product.sku,

                "category_name": (
                    product.category.name
                    if product.category
                    else None
                ),

                "supplier_name": (
                    product.supplier.name
                    if product.supplier
                    else None
                ),

                "current_stock": current_stock,

                "low_stock_threshold": threshold,

                "units_sold_30_days": (
                    total_units_sold
                ),

                "average_daily_demand": round(
                    average_daily_demand,
                    2
                ),

                "days_of_stock": (
                    round(
                        days_of_stock,
                        1
                    )
                    if days_of_stock is not None
                    else None
                ),

                "risk_level": risk_level,

                "risk_score": risk_score,

                "action": action,

                "recommended_reorder_quantity": (
                    recommended_reorder_quantity
                ),

                "explanation": explanation,
            })

        return Response(insights)


# =========================================================
# FRONTEND PAGES
# =========================================================

def login_page(request):

    return render(
        request,
        "inventory/login.html"
    )


def dashboard_page(request):

    return render(
        request,
        "inventory/dashboard.html"
    )