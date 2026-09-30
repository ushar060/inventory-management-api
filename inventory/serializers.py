from rest_framework import serializers
from django.contrib.auth.models import User

from .models import (
    Product,
    Category,
    Supplier,
    StockMovement,
    PurchaseOrder,
    PurchaseOrderItem,
)


# =========================================================
# PRODUCT
# =========================================================

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


# =========================================================
# CATEGORY
# =========================================================

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = "__all__"


# =========================================================
# SUPPLIER
# =========================================================

class SupplierSerializer(serializers.ModelSerializer):

    class Meta:
        model = Supplier
        fields = "__all__"


# =========================================================
# STOCK MOVEMENT
# =========================================================

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


# =========================================================
# PURCHASE ORDER ITEM
# =========================================================

class PurchaseOrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    sku = serializers.CharField(
        source="product.sku",
        read_only=True
    )

    pending_quantity = serializers.SerializerMethodField()

    fulfillment_rate = serializers.SerializerMethodField()

    def get_pending_quantity(self, obj):

        return max(
            0,
            obj.quantity - obj.received_quantity
        )

    def get_fulfillment_rate(self, obj):

        if obj.quantity == 0:
            return 0

        return round(
            (
                obj.received_quantity /
                obj.quantity
            ) * 100,
            2
        )

    def validate_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Ordered quantity must be greater than 0."
            )

        return value

    def validate_received_quantity(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Received quantity cannot be negative."
            )

        return value

    def validate_unit_cost(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Unit cost must be greater than 0."
            )

        return value

    def validate(self, attrs):

        quantity = attrs.get(
            "quantity",
            getattr(self.instance, "quantity", None)
        )

        received_quantity = attrs.get(
            "received_quantity",
            getattr(
                self.instance,
                "received_quantity",
                0
            )
        )

        if (
            quantity is not None
            and received_quantity > quantity
        ):
            raise serializers.ValidationError(
                {
                    "received_quantity": (
                        "Received quantity cannot be "
                        "greater than ordered quantity."
                    )
                }
            )

        return attrs

    class Meta:

        model = PurchaseOrderItem

        fields = (
            "id",
            "purchase_order",
            "product",
            "product_name",
            "sku",
            "quantity",
            "received_quantity",
            "pending_quantity",
            "fulfillment_rate",
            "unit_cost",
            "created_at",
        )

        read_only_fields = (
            "purchase_order",
            "product_name",
            "sku",
            "pending_quantity",
            "fulfillment_rate",
            "created_at",
        )


# =========================================================
# PURCHASE ORDER
# =========================================================

class PurchaseOrderSerializer(serializers.ModelSerializer):

    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True
    )

    items = PurchaseOrderItemSerializer(
        many=True
    )

    total_ordered_quantity = serializers.SerializerMethodField()

    total_received_quantity = serializers.SerializerMethodField()

    fulfillment_rate = serializers.SerializerMethodField()

    lead_time_days = serializers.SerializerMethodField()

    pending_quantity = serializers.SerializerMethodField()

    def get_total_ordered_quantity(self, obj):

        return sum(
            item.quantity
            for item in obj.items.all()
        )

    def get_total_received_quantity(self, obj):

        return sum(
            item.received_quantity
            for item in obj.items.all()
        )

    def get_fulfillment_rate(self, obj):

        ordered_quantity = (
            self.get_total_ordered_quantity(obj)
        )

        if ordered_quantity == 0:
            return 0

        received_quantity = (
            self.get_total_received_quantity(obj)
        )

        return round(
            (
                received_quantity /
                ordered_quantity
            ) * 100,
            2
        )

    def get_lead_time_days(self, obj):

        if not obj.received_at:
            return None

        return (
            obj.received_at.date()
            - obj.ordered_at.date()
        ).days

    def get_pending_quantity(self, obj):

        ordered_quantity = (
            self.get_total_ordered_quantity(obj)
        )

        received_quantity = (
            self.get_total_received_quantity(obj)
        )

        return max(
            0,
            ordered_quantity - received_quantity
        )

    def validate_order_number(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Order number cannot be empty."
            )

        return value

    def validate(self, attrs):

        expected_delivery = attrs.get(
            "expected_delivery"
        )

        if (
            expected_delivery
            and expected_delivery < (
                self.instance.ordered_at.date()
                if self.instance
                else expected_delivery
            )
        ):
            raise serializers.ValidationError(
                {
                    "expected_delivery": (
                        "Expected delivery date cannot be "
                        "before the order date."
                    )
                }
            )

        return attrs

    def create(self, validated_data):

        items_data = validated_data.pop(
            "items",
            []
        )

        purchase_order = PurchaseOrder.objects.create(
            **validated_data
        )

        for item_data in items_data:

            PurchaseOrderItem.objects.create(
                purchase_order=purchase_order,
                **item_data
            )

        return purchase_order

    def update(self, instance, validated_data):

        items_data = validated_data.pop(
            "items",
            None
        )

        instance = super().update(
            instance,
            validated_data
        )

        if items_data is not None:

            existing_items = {
                item.id: item
                for item in instance.items.all()
            }

            received_item_ids = set()

            for item_data in items_data:

                item_id = item_data.get(
                    "id"
                )

                if item_id and item_id in existing_items:

                    item = existing_items[item_id]

                    for field, value in item_data.items():

                        if field != "id":
                            setattr(
                                item,
                                field,
                                value
                            )

                    item.save()

                    received_item_ids.add(
                        item_id
                    )

                else:

                    PurchaseOrderItem.objects.create(
                        purchase_order=instance,
                        **item_data
                    )

            for item_id, item in existing_items.items():

                if item_id not in received_item_ids:
                    continue

        return instance

    class Meta:

        model = PurchaseOrder

        fields = (
            "id",
            "supplier",
            "supplier_name",
            "order_number",
            "ordered_at",
            "expected_delivery",
            "received_at",
            "status",
            "notes",
            "items",
            "total_ordered_quantity",
            "total_received_quantity",
            "pending_quantity",
            "fulfillment_rate",
            "lead_time_days",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "supplier_name",
            "ordered_at",
            "total_ordered_quantity",
            "total_received_quantity",
            "pending_quantity",
            "fulfillment_rate",
            "lead_time_days",
            "created_at",
            "updated_at",
        )


# =========================================================
# REGISTER
# =========================================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True
    )

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