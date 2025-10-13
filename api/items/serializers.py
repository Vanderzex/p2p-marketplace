from rest_framework import serializers
from .models import Item, ItemImage
from transactions.models import Transaction


# Serializer για κάθε εικόνα αντικειμένου
class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ["id", "image", "uploaded_at"]  # uploaded_at αν υπάρχει στο model


# Serializer για το αντικείμενο (Item)
class ItemSerializer(serializers.ModelSerializer):
    # Nested εικόνες (gallery)
    images = ItemImageSerializer(many=True, read_only=True)

    # Προαιρετική κύρια εικόνα
    main_image = serializers.ImageField(required=False, allow_null=True)

    # Πληροφορίες ιδιοκτήτη
    owner_id = serializers.ReadOnlyField(source="owner.id")
    owner_username = serializers.ReadOnlyField(source="owner.username")

    # Όλες οι συναλλαγές που σχετίζονται με το αντικείμενο
    transactions = serializers.SerializerMethodField()

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
        ]

    # Lazy import για αποφυγή circular import (π.χ. items ↔ transactions)
    def get_transactions(self, obj):
        from transactions.serializers import TransactionSerializer
        transactions = Transaction.objects.filter(item=obj)
        return TransactionSerializer(transactions, many=True).data
