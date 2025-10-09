from rest_framework import serializers
from .models import Item, ItemImage
from transactions.models import Transaction


# Serializer για κάθε επιμέρους εικόνα (ItemImage)
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

    # Εμφάνιση του username του ιδιοκτήτη
    owner = serializers.ReadOnlyField(source="owner.username")

    # Προαιρετικά: όλες οι συναλλαγές που σχετίζονται με το αντικείμενο
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
            "owner",
            "transactions",
        ]

    # Lazy import για TransactionSerializer (για αποφυγή circular import)
    def get_transactions(self, obj):
        from transactions.serializers import TransactionSerializer  # import μέσα στη μέθοδο (lazy)
        transactions = Transaction.objects.filter(item=obj)
        return TransactionSerializer(transactions, many=True).data
