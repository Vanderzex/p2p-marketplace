from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# Εμφάνιση στοιχείων χρήστη (π.χ. στο /me/)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


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


# Serializer που επιστρέφει JWT tokens μετά το register (προαιρετικό)
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
