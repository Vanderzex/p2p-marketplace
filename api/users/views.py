from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


# 🧩 Εγγραφή νέου χρήστη
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return Response(
            {"detail": "Ο λογαριασμός δημιουργήθηκε επιτυχώς!"},
            status=status.HTTP_201_CREATED
        )


# 👤 Επιστροφή στοιχείων τρέχοντος χρήστη (με JWT)
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# 🌍 Προβολή προφίλ χρηστών (και ενημέρωση τοποθεσίας)
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Επιτρέπει:
      - GET /api/users/ → λίστα χρηστών
      - GET /api/users/<id>/ → προφίλ χρήστη
      - POST /api/users/<id>/update_location/ → ενημέρωση τοποθεσίας (μόνο για τον εαυτό του)
    """
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    # ➕ Προαιρετικό custom action για ενημέρωση τοποθεσίας
    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def update_location(self, request):
        """
        Endpoint: POST /api/users/update_location/
        Body: { "latitude": 37.9838, "longitude": 23.7275, "location_name": "Athens, Greece" }
        """
        user = request.user
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        location_name = request.data.get("location_name")

        if lat is None or lng is None:
            return Response(
                {"detail": "Απαιτούνται πεδία latitude και longitude."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.latitude = lat
        user.longitude = lng
        if location_name:
            user.location_name = location_name
        user.save()

        return Response(
            {"detail": "Η τοποθεσία σου ενημερώθηκε επιτυχώς!"},
            status=status.HTTP_200_OK,
        )
