from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q, Avg
from transactions.models import Transaction, Review

User = get_user_model()


# 🔹 Βασικός serializer χρήστη
class UserSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    total_completed_transactions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            # ➕ Νέα πεδία για geolocation:
            "latitude",
            "longitude",
            "location_name",
            # ➕ Στατιστικά
            "average_rating",
            "total_completed_transactions",
            "profile_image",
        ]

    # Μέση αξιολόγηση
    def get_average_rating(self, obj):
        avg = obj.received_reviews.aggregate(Avg("rating"))["rating__avg"]
        return round(avg or 0, 2)

    # Πλήθος ολοκληρωμένων συναλλαγών
    def get_total_completed_transactions(self, obj):
        return Transaction.objects.filter(
            Q(requester=obj) | Q(owner=obj),
            status="completed",
        ).count()

    # Επιστροφή λίστας αξιολογήσεων χωρίς circular import
    def to_representation(self, instance):
        from transactions.serializers import ReviewSerializer  # lazy import
        representation = super().to_representation(instance)

        reviews = getattr(instance, "received_reviews", None)
        if reviews is not None:
            representation["reviews_received"] = ReviewSerializer(reviews, many=True).data
        else:
            representation["reviews_received"] = []

        return representation


# 🔹 Εγγραφή νέου χρήστη
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


# 🔹 Εγγραφή + αυτόματη έκδοση token (προαιρετικό)
class RegisterWithTokenSerializer(RegisterSerializer):
    token = serializers.SerializerMethodField()

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ["token"]

    def get_token(self, obj):
        refresh = RefreshToken.for_user(obj)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
