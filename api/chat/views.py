from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer
from notifications.models import Notification


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Message.objects.filter(Q(sender=user) | Q(receiver=user))
            .select_related('sender', 'receiver', 'transaction')
            .order_by('created_at')
        )

    def perform_create(self, serializer):
        sender = self.request.user
        receiver_id = self.request.data.get('receiver')
        text = self.request.data.get('text', '').strip()

        if not receiver_id or not text:
            raise ValueError("Receiver and text required")

        # Αποθήκευση μηνύματος
        message = serializer.save(sender=sender)

        #Δημιουργία ειδοποίησης για τον παραλήπτη
        try:
            Notification.objects.create(
                user_id=receiver_id,
                transaction=message.transaction,
                message=f"💬 Νέο μήνυμα από {sender.username} στη συναλλαγή #{message.transaction.id if message.transaction else '-'}"
            )
        except Exception as e:
            print(f"⚠️ Notification creation failed: {e}")

    #Εμφάνιση συνομιλίας 2 χρηστών
    @action(detail=False, methods=['get'], url_path='thread/(?P<user_id>[^/.]+)')
    def thread(self, request, user_id=None):
        user = request.user
        msgs = (
            Message.objects.filter(
                Q(sender=user, receiver_id=user_id) | Q(sender_id=user_id, receiver=user)
            )
            .select_related('sender', 'receiver')
            .order_by('created_at')
        )

        # Μαρκάρουμε τα μηνύματα του άλλου ως αναγνωσμένα
        unread = msgs.filter(receiver=user, is_read=False)
        if unread.exists():
            unread.update(is_read=True)

        return Response(MessageSerializer(msgs, many=True).data)

    # Μηνύματα για μια συναλλαγή
    @action(detail=False, methods=['get'], url_path='transaction/(?P<tx_id>[^/.]+)')
    def transaction_thread(self, request, tx_id=None):
        user = request.user
        msgs = (
            Message.objects.filter(transaction_id=tx_id)
            .select_related('sender', 'receiver')
            .order_by('created_at')
        )

        # Μαρκάρουμε τα εισερχόμενα ως διαβασμένα
        unread = msgs.filter(receiver=user, is_read=False)
        if unread.exists():
            unread.update(is_read=True)

        return Response(MessageSerializer(msgs, many=True).data)
