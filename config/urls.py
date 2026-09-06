from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from inventory.views import (
    login_page,
    dashboard_page,
)


urlpatterns = [

    # Django Admin
    path(
        "admin/",
        admin.site.urls
    ),


    # Inventory API
    path(
        "api/",
        include("inventory.urls")
    ),


    # Swagger / OpenAPI
    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema"
        ),
        name="swagger-ui",
    ),


    # Frontend pages
    path(
        "login/",
        login_page
    ),

    path(
        "dashboard/",
        dashboard_page
    ),
]