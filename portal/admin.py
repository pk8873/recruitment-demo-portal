from django.contrib import admin
from .models import Application

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("full_name", "position", "city", "state", "submitted_at", "reference")
    list_filter = ("state", "qualification", "submitted_at")
    search_fields = ("full_name", "email", "phone", "reference")
    readonly_fields = ("reference", "submission_key", "submitted_at")
    date_hierarchy = "submitted_at"
    ordering = ("-submitted_at",)

    def has_add_permission(self, request):
        return False
