from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from django.db import models, transaction
from django.shortcuts import render

from .models import Product, Category, Supplier, StockMovement
from .serializers import (
    ProductSerializer,
    CategorySerializer,
    SupplierSerializer,
    StockMovementSerializer,
    RegisterSerializer,
)
from .permissions import IsStaffOrReadOnly


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.all()

        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        supplier = self.request.query_params.get("supplier")
        low_stock = self.request.query_params.get("low_stock")

        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search)
                | models.Q(sku__icontains=search)
            )

        if category:
            queryset = queryset.filter(category_id=category)

        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        if low_stock == "true":
            queryset = queryset.filter(
                quantity__lte=models.F("low_stock_threshold")
            )

        return queryset


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]


class SupplierListCreateView(generics.ListCreateAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsStaffOrReadOnly]


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsStaffOrReadOnly]


class LowStockProductView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(
            quantity__lte=models.F("low_stock_threshold")
        )


class StockMovementListCreateView(generics.ListCreateAPIView):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsStaffOrReadOnly]

    def perform_create(self, serializer):
        with transaction.atomic():
            movement = serializer.save()
            product = movement.product

            if movement.movement_type == "IN":
                product.quantity += movement.quantity

            elif movement.movement_type == "OUT":
                if movement.quantity > product.quantity:
                    raise serializers.ValidationError(
                        "Not enough stock available."
                    )

                product.quantity -= movement.quantity

            product.save()


class ProductStockHistoryView(generics.ListAPIView):
    serializer_class = StockMovementSerializer

    def get_queryset(self):
        product_id = self.kwargs["pk"]

        return StockMovement.objects.filter(
            product_id=product_id
        ).order_by("-created_at")


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

def login_page(request):
    return render(request, "inventory/login.html")


def dashboard_page(request):
    return render(request, "inventory/dashboard.html")