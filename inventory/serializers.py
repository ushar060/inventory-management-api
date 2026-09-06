from rest_framework import serializers
from django.contrib.auth.models import User

from .models import Product, Category, Supplier, StockMovement


class ProductSerializer(serializers.ModelSerializer):

    low_stock = serializers.SerializerMethodField()

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True
    )

    def get_low_stock(self, obj):
        return obj.quantity <= obj.low_stock_threshold

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Price must be greater than 0."
            )
        return value

    def validate_low_stock_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Low stock threshold cannot be negative."
            )
        return value

    class Meta:
        model = Product

        fields = (
            "id",
            "name",
            "sku",
            "description",
            "price",
            "quantity",
            "low_stock_threshold",
            "category",
            "category_name",
            "supplier",
            "supplier_name",
            "created_at",
            "updated_at",
            "low_stock",
        )

        read_only_fields = (
            "low_stock",
            "category_name",
            "supplier_name",
        )


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = "__all__"


class SupplierSerializer(serializers.ModelSerializer):

    class Meta:
        model = Supplier
        fields = "__all__"


class StockMovementSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Movement quantity must be greater than 0."
            )
        return value

    class Meta:
        model = StockMovement

        fields = (
            "id",
            "product",
            "product_name",
            "movement_type",
            "quantity",
            "reason",
            "created_at",
        )

        read_only_fields = (
            "product_name",
        )


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User

        fields = (
            "username",
            "email",
            "password",
        )

    def create(self, validated_data):

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user