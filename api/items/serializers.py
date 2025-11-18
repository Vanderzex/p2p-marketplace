from rest_framework import serializers
from .models import Item, ItemImage
from transactions.models import Transaction


# Serializer για κάθε εικόνα αντικειμένου
class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ["id", "image", "uploaded_at"]


# Serializer για το αντικείμενο (Item)
class ItemSerializer(serializers.ModelSerializer):
    # Nested εικόνες (gallery)
    images = ItemImageSerializer(many=True, read_only=True)

    # Προαιρετική κύρια εικόνα
    main_image = serializers.ImageField(required=False, allow_null=True)

    # Πληροφορίες ιδιοκτήτη
    owner_id = serializers.ReadOnlyField(source="owner.id")
    owner_username = serializers.ReadOnlyField(source="owner.username")
    owner_profile_image = serializers.SerializerMethodField()

    # Όλες οι συναλλαγές που σχετίζονται με το αντικείμενο
    transactions = serializers.SerializerMethodField()

    # Ποσοστό rating ιδιοκτήτη
    owner_rating_percent = serializers.SerializerMethodField()

    # ➕ ΝΕΟ ΠΕΔΙΟ: αν το αντικείμενο είναι στα αγαπημένα του τρέχοντος χρήστη
    is_favorite = serializers.SerializerMethodField()

    def get_owner_profile_image(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        if getattr(obj.owner, "profile_image", None):
            return request.build_absolute_uri(obj.owner.profile_image.url)
        return None

    def get_owner_rating_percent(self, obj):
        if hasattr(obj.owner, "avg_rating") and obj.owner.avg_rating is not None:
            try:
                return round((obj.owner.avg_rating / 5) * 100)
            except ZeroDivisionError:
                return None
        return None

    # Lazy import για αποφυγή circular import (π.χ. items ↔ transactions)
    def get_transactions(self, obj):
        from transactions.serializers import TransactionSerializer
        transactions = Transaction.objects.filter(item=obj)
        return TransactionSerializer(transactions, many=True).data

    # 🔴 Υπολογισμός αν είναι αγαπημένο
    def get_is_favorite(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or user.is_anonymous:
            return False
        return obj.favorites.filter(id=user.id).exists()

    class Meta:
        model = Item
        fields = [
            "id",
            "title",
            "description",
            "transaction_type",
            "available",
            "terms",
            "created_at",
            "main_image",
            "images",
            "owner_id",
            "owner_username",
            "transactions",
            "category",
            "delivery_method",
            "owner_profile_image",
            "views",
            "owner_rating_percent",
            "is_favorite",
        ]
