from rest_framework import generics, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


# Εγγραφή νέου χρήστη
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


# Επιστροφή στοιχείων τρέχοντος χρήστη (με JWT)
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
       context = super().get_serializer_context()
       context["request"] = self.request
       return context


    def get_object(self):
        return self.request.user


# Προβολή προφίλ χρηστών (και ενημέρωση τοποθεσίας)
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Επιτρέπει:
      - GET /api/users/ → λίστα χρηστών
      - GET /api/users/<id>/ → προφίλ χρήστη
      - POST /api/users/update_location/ → ενημέρωση τοποθεσίας (μόνο για τον εαυτό του)
    """
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    # Προαιρετικό custom action για ενημέρωση τοποθεσίας
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


# Ανέβασμα / ενημέρωση φωτογραφίας προφίλ
class UploadProfileImageView(generics.UpdateAPIView):
    """
    Endpoint: PATCH /api/upload-profile-image/
    Body: multipart/form-data → { "profile_image": <αρχείο> }
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, *args, **kwargs):
        user = request.user
        image = request.FILES.get("profile_image")
        if not image:
            return Response({"detail": "Δεν στάλθηκε εικόνα."}, status=status.HTTP_400_BAD_REQUEST)

        user.profile_image = image
        user.save()

        image_url = request.build_absolute_uri(user.profile_image.url)

        return Response(
            {"detail": "Η φωτογραφία προφίλ ενημερώθηκε επιτυχώς!",
             "profile_image": image_url,
             },
            status=status.HTTP_200_OK
        )


# Αλλαγή κωδικού πρόσβασης
class ChangePasswordView(generics.UpdateAPIView):
    """
    Endpoint: PUT /api/change-password/
    Body: { "old_password": "παλιός", "new_password": "νέος" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"detail": "Απαιτούνται τα πεδία old_password και new_password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {"detail": "Ο παλιός κωδικός είναι λάθος."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {"detail": "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response(
            {"detail": "Ο κωδικός άλλαξε επιτυχώς!"},
            status=status.HTTP_200_OK
        )
