from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
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

    def get_object(self):
        return self.request.user

# Προβολή προφίλ άλλων χρηστών
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Επιτρέπει GET /api/users/ και GET /api/users/<id>/
    """
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
