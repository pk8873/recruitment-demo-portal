from django.contrib import admin
from django.urls import path
from portal import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", views.health, name="health"),
    path("", views.home, name="home"),
    path("apply/", views.apply, name="apply"),
    path("receipt/<uuid:reference>/", views.receipt, name="receipt"),
    path("receipt/<uuid:reference>/download/", views.receipt_pdf, name="receipt_pdf"),
]
