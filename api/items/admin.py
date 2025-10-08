from django.contrib import admin
from .models import Item, ItemImage

# Inline εμφάνιση φωτογραφιών μέσα στη σελίδα του Item
class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1  # Πόσες κενές γραμμές να εμφανίζει για νέες εικόνες
    fields = ("image",)
    readonly_fields = ()

# Προβολή Item με gallery υποστήριξη
@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'transaction_type', 'available', 'created_at')
    list_filter = ('transaction_type', 'available', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('-created_at',)

    inlines = [ItemImageInline]  # Εμφανίζει τις εικόνες του item inline

# Εγγραφή του ItemImage στο admin (αν θέλεις να το βλέπεις και ξεχωριστά)
@admin.register(ItemImage)
class ItemImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'item', 'image')
    search_fields = ('item__title',)
    ordering = ('id',)
