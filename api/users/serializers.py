from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q, Avg
from transactions.models import Transaction, Review

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    total_completed_transactions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'average_rating',
            'total_completed_transactions',
        ]

    # Μέση αξιολόγηση
    def get_average_rating(self, obj):
        avg = obj.received_reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg or 0, 2)

    # Πλήθος ολοκληρωμένων συναλλαγών
    def get_total_completed_transactions(self, obj):
        return Transaction.objects.filter(
            Q(requester=obj) | Q(owner=obj),
            status='completed'
        ).count()

    # Προσθήκη reviews στο τελικό output χωρίς circular import
    def to_representation(self, instance):
        from transactions.serializers import ReviewSerializer  # lazy import
        representation = super().to_representation(instance)

        reviews = getattr(instance, "received_reviews", None)
        if reviews is not None:
            representation["reviews_received"] = ReviewSerializer(reviews, many=True).data
        else:
            representation["reviews_received"] = []

        return representation


# Εγγραφή νέου χρήστη (Register)
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )
        return user


class RegisterWithTokenSerializer(RegisterSerializer):
    token = serializers.SerializerMethodField()

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ['token']

    def get_token(self, obj):
        refresh = RefreshToken.for_user(obj)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
