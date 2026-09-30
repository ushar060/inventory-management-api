from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


# =====================================================
# STOCKPILOT FRONTEND VIEWS
# =====================================================

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


# =====================================================
# URL PATTERNS
# =====================================================

urlpatterns = [

    # =================================================
    # ADMIN
    # =================================================

    path(
        "admin/",
        admin.site.urls,
        name="admin",
    ),


    # =================================================
    # API
    # =================================================

    path(
        "api/",
        include("inventory.urls"),
    ),


    # =================================================
    # API SCHEMA
    # =================================================

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),


    # =================================================
    # SWAGGER
    # =================================================

    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema"
        ),
        name="swagger-ui",
    ),


    # =================================================
    # REDOC
    # =================================================

    path(
        "api/redoc/",
        SpectacularRedocView.as_view(
            url_name="schema"
        ),
        name="redoc",
    ),


    # =================================================
    # LOGIN PAGE
    # =================================================

    path(
        "login/",
        login_page,
        name="login",
    ),


    # =================================================
    # DASHBOARD
    # =================================================

    path(
        "dashboard/",
        dashboard_page,
        name="dashboard",
    ),


    # =================================================
    # ROOT
    # =================================================

    path(
        "",
        login_page,
        name="home",
    ),
]