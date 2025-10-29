from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer
from notifications.models import Notification
from items.models import Item


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Message.objects.filter(Q(sender=user) | Q(receiver=user))
            .select_related("sender", "receiver", "transaction", "item")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        sender = self.request.user
        receiver_id = self.request.data.get("receiver")
        text = self.request.data.get("text", "").strip()
        transaction_id = self.request.data.get("transaction")
        item_id = self.request.data.get("item")  # ✅

        if not receiver_id or not text:
            raise ValueError("Receiver and text required")

        # ✅ Αποθήκευση μηνύματος
        message = serializer.save(sender=sender)

        try:
            # 📦 Chat μέσα σε συναλλαγή
            if transaction_id:
                Notification.objects.create(
                    user_id=receiver_id,
                    sender=sender,
                    type="message",
                    transaction=message.transaction,
                    message=f"💬 Νέο μήνυμα από {sender.username} στη συναλλαγή #{message.transaction.id}",
                )

            # 💬 Chat μεταξύ χρηστών για αντικείμενο
            elif item_id:
                try:
                    related_item = Item.objects.get(id=item_id)
                except Item.DoesNotExist:
                    related_item = None

                Notification.objects.create(
                    user_id=receiver_id,
                    sender=sender,
                    type="message",
                    item=related_item,  # ✅ Αποθηκεύεται στο Notification
                    message=(
                        f"💬 Νέο μήνυμα από {sender.username} σχετικά με το αντικείμενο "
                        f"'{related_item.title}'" if related_item else f"💬 Νέο μήνυμα από {sender.username}"
                    ),
                )

            # 💬 Γενικό μήνυμα χωρίς item/transaction
            else:
                Notification.objects.create(
                    user_id=receiver_id,
                    sender=sender,
                    type="message",
                    message=f"💬 Νέο μήνυμα από {sender.username}",
                )

        except Exception as e:
            print(f"⚠️ Notification creation failed: {e}")

    # Εμφάνιση συνομιλίας μεταξύ δύο χρηστών
    @action(detail=False, methods=["get"], url_path="thread/(?P<user_id>[^/.]+)")
    def thread(self, request, user_id=None):
        user = request.user
        msgs = (
            Message.objects.filter(
                Q(sender=user, receiver_id=user_id) | Q(sender_id=user_id, receiver=user)
            )
            .select_related("sender", "receiver", "item")
            .order_by("created_at")
        )

        # Μαρκάρουμε τα μηνύματα του άλλου ως διαβασμένα
        unread = msgs.filter(receiver=user, is_read=False)
        if unread.exists():
            unread.update(is_read=True)

        return Response(MessageSerializer(msgs, many=True).data)

    # Μηνύματα για μια συναλλαγή
    @action(detail=False, methods=["get"], url_path="transaction/(?P<tx_id>[^/.]+)")
    def transaction_thread(self, request, tx_id=None):
        user = request.user
        msgs = (
            Message.objects.filter(transaction_id=tx_id)
            .select_related("sender", "receiver", "transaction", "item")
            .order_by("created_at")
        )

        # Μαρκάρουμε τα εισερχόμενα ως διαβασμένα
        unread = msgs.filter(receiver=user, is_read=False)
        if unread.exists():
            unread.update(is_read=True)

        return Response(MessageSerializer(msgs, many=True).data)
