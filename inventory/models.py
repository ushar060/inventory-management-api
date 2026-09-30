from django.db import models


# =========================================================
# CATEGORY
# =========================================================

class Category(models.Model):

    name = models.CharField(max_length=100)

    description = models.TextField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name


# =========================================================
# SUPPLIER
# =========================================================

class Supplier(models.Model):

    name = models.CharField(max_length=200)

    email = models.EmailField(
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name


# =========================================================
# PRODUCT
# =========================================================

class Product(models.Model):

    name = models.CharField(
        max_length=200
    )

    sku = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    quantity = models.PositiveIntegerField(
        default=0
    )

    low_stock_threshold = models.PositiveIntegerField(
        default=10
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="products",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    @property
    def low_stock(self):
        return self.quantity <= self.low_stock_threshold

    def __str__(self):
        return self.name


# =========================================================
# STOCK MOVEMENT
# =========================================================

class StockMovement(models.Model):

    MOVEMENT_IN = "IN"
    MOVEMENT_OUT = "OUT"

    MOVEMENT_TYPES = [
        (MOVEMENT_IN, "Stock In"),
        (MOVEMENT_OUT, "Stock Out"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_movements"
    )

    movement_type = models.CharField(
        max_length=10,
        choices=MOVEMENT_TYPES
    )

    quantity = models.PositiveIntegerField()

    reason = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"{self.product.name} - "
            f"{self.movement_type} - "
            f"{self.quantity}"
        )


# =========================================================
# PURCHASE ORDER
# =========================================================

class PurchaseOrder(models.Model):

    STATUS_PENDING = "PENDING"
    STATUS_PARTIAL = "PARTIAL"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PARTIAL, "Partially Received"),
        (STATUS_RECEIVED, "Received"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders"
    )

    order_number = models.CharField(
        max_length=50,
        unique=True
    )

    ordered_at = models.DateTimeField(
        auto_now_add=True
    )

    expected_delivery = models.DateField(
        blank=True,
        null=True
    )

    received_at = models.DateTimeField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    notes = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    @property
    def total_ordered_quantity(self):

        return sum(
            item.quantity
            for item in self.items.all()
        )

    @property
    def total_received_quantity(self):

        return sum(
            item.received_quantity
            for item in self.items.all()
        )

    @property
    def fulfillment_rate(self):

        ordered = self.total_ordered_quantity

        if ordered == 0:
            return 0

        return round(
            (
                self.total_received_quantity /
                ordered
            ) * 100,
            2
        )

    @property
    def lead_time_days(self):

        if not self.received_at:
            return None

        return (
            self.received_at.date() -
            self.ordered_at.date()
        ).days

    def __str__(self):
        return self.order_number


# =========================================================
# PURCHASE ORDER ITEM
# =========================================================

class PurchaseOrderItem(models.Model):

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="purchase_order_items"
    )

    quantity = models.PositiveIntegerField()

    received_quantity = models.PositiveIntegerField(
        default=0
    )

    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    @property
    def pending_quantity(self):

        return max(
            0,
            self.quantity - self.received_quantity
        )

    @property
    def fulfillment_rate(self):

        if self.quantity == 0:
            return 0

        return round(
            (
                self.received_quantity /
                self.quantity
            ) * 100,
            2
        )

    def __str__(self):

        return (
            f"{self.purchase_order.order_number} - "
            f"{self.product.name}"
        )