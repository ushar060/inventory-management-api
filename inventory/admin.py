from django.contrib import admin
from .models import Category, Product, Supplier


admin.site.register(Category)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "category",
        "supplier",
        "price",
        "quantity",
        "low_stock_threshold",
        "created_at",
    )
    list_filter = ("category", "supplier")
    search_fields = ("name", "sku")


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "phone",
        "created_at",
    )
    search_fields = (
        "name",
        "email",
        "phone",
    )