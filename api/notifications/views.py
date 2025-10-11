from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet για ειδοποιήσεις (μηνύματα + συναλλαγές)
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(user=user).select_related(
            "sender", "transaction"
        ).order_by("-created_at")

    # Επιστροφή μη αναγνωσμένων
    @action(detail=False, methods=["get"])
    def unread(self, request):
        unread = Notification.objects.filter(user=request.user, is_read=False).select_related(
            "sender", "transaction"
        )
        return Response(NotificationSerializer(unread, many=True).data)

    # Επιστροφή πλήθους μη αναγνωσμένων
    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})

    # Μαρκάρισμα όλων ως διαβασμένες
    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "✅ Όλες οι ειδοποιήσεις σημειώθηκαν ως διαβασμένες"})

    # Μαρκάρισμα μιας ειδοποίησης
    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.save(update_fields=["is_read"])
            return Response({"detail": "📖 Η ειδοποίηση σημειώθηκε ως διαβασμένη"})
        except Notification.DoesNotExist:
            return Response({"error": "❌ Δεν βρέθηκε"}, status=status.HTTP_404_NOT_FOUND)
