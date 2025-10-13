from django.contrib import admin
from .models import Transaction, Review


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'requester',
        'owner',
        'transaction_type',
        'status',
        'created_at',
        'distance_display',  # ✅ Νέα στήλη
    )
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('requester__username', 'owner__username', 'item__title')

    @admin.display(description="Απόσταση (km)")
    def distance_display(self, obj):
        return f"{obj.distance_km} km" if obj.distance_km is not None else "—"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reviewer',
        'reviewed_user',
        'rating',
        'created_at',
    )
    list_filter = ('rating', 'created_at')
    search_fields = ('reviewer__username', 'reviewed_user__username')
