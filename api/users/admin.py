from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Custom εμφάνιση του User στο admin panel."""

    # 🧭 Πεδία που φαίνονται στη λίστα χρηστών
    list_display = (
        "username",
        "email",
        "average_rating",
        "total_completed_transactions",
        "latitude",
        "longitude",
        "is_staff",
        "show_profile_image",
    )

    # 🔍 Πεδία αναζήτησης
    search_fields = ("username", "email", "location_name")

    # 🧩 Φίλτρα δεξιά
    list_filter = ("is_staff", "is_active", "is_superuser")

    # 🗂 Ενότητες (fieldset) στη φόρμα επεξεργασίας
    fieldsets = UserAdmin.fieldsets + (
        ("Πληροφορίες Προφίλ", {"fields": ("bio", "profile_image")}),
        ("Στατιστικά", {"fields": ("average_rating", "total_completed_transactions")}),
        ("Τοποθεσία", {"fields": ("latitude", "longitude", "location_name")}),
    )

    # 🔒 Ανάγνωση μόνο για αυτόματα υπολογιζόμενα πεδία
    readonly_fields = ("average_rating", "total_completed_transactions", "show_profile_image")

    def show_profile_image(self, obj):
        """Εμφάνιση προεπισκόπησης εικόνας προφίλ στο admin."""
        if obj.profile_image:
            return format_html('<img src="{}" width="60" style="border-radius:6px"/>', obj.profile_image.url)
        return "—"
    show_profile_image.short_description = "Φωτογραφία"

