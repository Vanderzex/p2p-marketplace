from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Transaction, Review
from .serializers import TransactionSerializer, ReviewSerializer
from items.models import Item
from notifications.models import Notification


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για συναλλαγές (Ανταλλαγή / Δανεισμός)
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Εμφάνιση μόνο συναλλαγών που αφορούν τον χρήστη
    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(Q(requester=user) | Q(owner=user)).order_by('-created_at')

    # Δημιουργία νέας συναλλαγής
    def perform_create(self, serializer):
        requester = self.request.user
        data = self.request.data
        item_id = data.get('item') or data.get('item_id')
        transaction_type = data.get('transaction_type')

        if not item_id:
            raise serializers.ValidationError({'error': 'Δεν στάλθηκε item_id.'})

        try:
            item = Item.objects.get(id=item_id)
        except Item.DoesNotExist:
            raise serializers.ValidationError({'error': 'Το αντικείμενο δεν βρέθηκε.'})

        if item.owner == requester:
            raise serializers.ValidationError({'error': 'Δεν μπορείς να κάνεις συναλλαγή με το δικό σου αντικείμενο.'})

        if not item.available:
            raise serializers.ValidationError({'error': 'Το αντικείμενο δεν είναι διαθέσιμο.'})

        if transaction_type not in ['exchange', 'loan', 'either']:
            raise serializers.ValidationError({'error': 'Μη έγκυρος τύπος συναλλαγής.'})

        # Έλεγχοι για ενεργές συναλλαγές
        existing_same_user = Transaction.objects.filter(
            requester=requester, item=item,
            status__in=['pending', 'accepted', 'pending_terms', 'pending_confirmation']
        ).exists()
        if existing_same_user:
            raise serializers.ValidationError({'error': 'Έχετε ήδη ενεργή αίτηση για αυτό το αντικείμενο.'})

        active_for_item = Transaction.objects.filter(
            item=item, status__in=['pending', 'accepted', 'pending_terms', 'pending_confirmation']
        ).exists()
        if active_for_item:
            raise serializers.ValidationError({'error': 'Το αντικείμενο έχει ήδη ενεργή συναλλαγή.'})

        # Δημιουργία συναλλαγής
        transaction = serializer.save(
            requester=requester,
            owner=item.owner,
            item=item,
            transaction_type=transaction_type,
            terms=item.terms or ""
        )

        # Ειδοποίηση στον ιδιοκτήτη
        Notification.objects.create(
            user=item.owner,
            sender=requester,
            transaction=transaction,
            message=f"📩 Ο χρήστης {requester.username} ζήτησε συναλλαγή για το '{item.title}'."
        )

    # Ενημέρωση κατάστασης
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        data = request.data

        if instance.owner != user:
            return Response({'error': 'Δεν έχεις δικαίωμα αλλαγής κατάστασης.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = data.get('status')
        if new_status not in ['accepted', 'rejected', 'cancelled', 'pending_terms']:
            return Response({'error': 'Μη έγκυρη κατάσταση.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status in ['accepted', 'pending_terms']:
            if instance.transaction_type == 'loan':
                start_date = data.get('start_date')
                end_date = data.get('end_date')
                if not start_date or not end_date:
                    return Response({'error': 'Πρέπει να δηλωθεί διάρκεια δανεισμού.'}, status=status.HTTP_400_BAD_REQUEST)
                instance.start_date = start_date
                instance.end_date = end_date
                instance.item.available = False
                instance.item.save()

            if data.get('terms'):
                instance.terms = data['terms']
                instance.status = 'pending_terms'
            else:
                instance.status = 'accepted'

            # Ειδοποίηση στον αιτούντα
            Notification.objects.create(
                user=instance.requester,
                sender=user,
                transaction=instance,
                message=f"✅ Ο {user.username} αποδέχθηκε το αίτημά σου για '{instance.item.title}'."
            )

        elif new_status == 'rejected':
            instance.status = 'rejected'
            Notification.objects.create(
                user=instance.requester,
                sender=user,
                transaction=instance,
                message=f"❌ Ο {user.username} απέρριψε το αίτημά σου για '{instance.item.title}'."
            )

        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # Ο ιδιοκτήτης επιλέγει αντικείμενο για ανταλλαγή
    @action(detail=True, methods=['post'])
    def select_exchange_item(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.owner != user:
            return Response({'error': 'Δεν έχεις δικαίωμα σε αυτή τη συναλλαγή.'}, status=status.HTTP_403_FORBIDDEN)
        if tx.transaction_type != 'exchange':
            return Response({'error': 'Η συναλλαγή δεν είναι τύπου ανταλλαγής.'}, status=status.HTTP_400_BAD_REQUEST)

        selected_item_id = request.data.get('selected_item_id')
        if not selected_item_id:
            return Response({'error': 'Πρέπει να επιλέξεις αντικείμενο του αιτούντος.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            selected_item = Item.objects.get(id=selected_item_id, owner=tx.requester)
        except Item.DoesNotExist:
            return Response({'error': 'Το αντικείμενο δεν βρέθηκε ή δεν ανήκει στον αιτούντα.'}, status=status.HTTP_400_BAD_REQUEST)

        tx.requested_item = selected_item
        tx.status = 'pending_confirmation'
        tx.save()

        # Ειδοποίηση στον αιτούντα
        Notification.objects.create(
            user=tx.requester,
            sender=user,
            transaction=tx,
            message=f"🔁 Ο {user.username} πρότεινε ανταλλαγή με το '{selected_item.title}'."
        )

        return Response({'message': '✅ Επιλέχθηκε αντικείμενο για ανταλλαγή.'})

    # Ο αιτών αποδέχεται την πρόταση ανταλλαγής
    @action(detail=True, methods=['post'])
    def confirm_exchange(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.requester != user:
            return Response({'error': 'Μόνο ο αιτών μπορεί να αποδεχθεί.'}, status=status.HTTP_403_FORBIDDEN)
        if tx.transaction_type != 'exchange' or tx.status != 'pending_confirmation':
            return Response({'error': 'Δεν υπάρχει εκκρεμής πρόταση.'}, status=status.HTTP_400_BAD_REQUEST)

        tx.status = 'accepted'
        tx.item.available = False
        tx.requested_item.available = False
        tx.item.save()
        tx.requested_item.save()
        tx.save()

        # Ειδοποίηση στον ιδιοκτήτη
        Notification.objects.create(
            user=tx.owner,
            sender=user,
            transaction=tx,
            message=f"✅ Ο {user.username} αποδέχθηκε την ανταλλαγή για '{tx.item.title}'."
        )

        return Response({'message': '✅ Η ανταλλαγή επιβεβαιώθηκε!'})

    # Ο αιτών δηλώνει επιστροφή (loan)
    @action(detail=True, methods=['post'])
    def confirm_return(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.requester != user:
            return Response({'error': 'Μόνο ο αιτών μπορεί να δηλώσει επιστροφή.'}, status=status.HTTP_403_FORBIDDEN)
        if tx.transaction_type != 'loan' or tx.status != 'accepted':
            return Response({'error': 'Η συναλλαγή δεν είναι ενεργή.'}, status=status.HTTP_400_BAD_REQUEST)

        tx.status = 'returned_by_requester'
        tx.returned_at = timezone.now()
        tx.save()

        # 🔔 Ειδοποίηση στον ιδιοκτήτη
        Notification.objects.create(
            user=tx.owner,
            sender=user,
            transaction=tx,
            message=f"↩️ Ο {user.username} δήλωσε επιστροφή για '{tx.item.title}'."
        )

        return Response({'message': '✅ Δήλωσες ότι επέστρεψες το αντικείμενο.'})

    # Ολοκλήρωση συναλλαγής
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.owner != user:
            return Response({'error': 'Μόνο ο ιδιοκτήτης μπορεί να ολοκληρώσει.'}, status=status.HTTP_403_FORBIDDEN)
        if tx.status not in ['accepted', 'returned_by_requester']:
            return Response({'error': 'Δεν υπάρχει ενεργή συναλλαγή προς ολοκλήρωση.'}, status=status.HTTP_400_BAD_REQUEST)

        if tx.transaction_type == 'exchange':
            if tx.item: tx.item.available = True; tx.item.save()
            if tx.requested_item: tx.requested_item.available = True; tx.requested_item.save()
        elif tx.transaction_type == 'loan':
            tx.item.available = True; tx.item.save()

        tx.status = 'completed'
        tx.returned_at = timezone.now()
        tx.save()

        # Ειδοποιήσεις και στους δύο
        for u in [tx.requester, tx.owner]:
            Notification.objects.create(
                user=u,
                sender=user,
                transaction=tx,
                message=f"🏁 Η συναλλαγή '{tx.item.title}' ολοκληρώθηκε επιτυχώς!"
            )

        return Response({'message': '✅ Η συναλλαγή ολοκληρώθηκε.'})

    # Προβολή συναλλαγών χρήστη
    @action(detail=False, methods=['get'], url_path='of_user/(?P<username>[\w.@+-]+)')
    def of_user(self, request, username=None):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'Ο χρήστης δεν βρέθηκε.'}, status=status.HTTP_404_NOT_FOUND)

        txs = Transaction.objects.filter(Q(requester=user) | Q(owner=user)).order_by('-created_at')
        return Response(self.get_serializer(txs, many=True).data)


# ViewSet για Αξιολογήσεις (Reviews)
class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Review.objects.filter(Q(reviewer=user) | Q(reviewed_user=user)).order_by('-created_at')

    def perform_create(self, serializer):
        reviewer = self.request.user
        tx = serializer.validated_data.get('transaction')

        if not tx:
            raise serializers.ValidationError({"transaction": "Απαιτείται έγκυρη συναλλαγή."})
        if reviewer not in [tx.requester, tx.owner]:
            raise serializers.ValidationError({"error": "Δεν συμμετέχεις σε αυτή τη συναλλαγή."})
        if tx.status != 'completed':
            raise serializers.ValidationError({"error": "Η συναλλαγή δεν έχει ολοκληρωθεί."})
        if Review.objects.filter(transaction=tx, reviewer=reviewer).exists():
            raise serializers.ValidationError({"error": "Έχεις ήδη αξιολογήσει."})

        reviewed_user = tx.owner if reviewer == tx.requester else tx.requester
        review = serializer.save(reviewer=reviewer, reviewed_user=reviewed_user)

        reviewed_user.update_average_rating()
        reviewed_user.update_total_completed_transactions()

        # Ειδοποίηση στον χρήστη που αξιολογήθηκε
        Notification.objects.create(
            user=reviewed_user,
            sender=reviewer,
            transaction=tx,
            message=f"⭐ Ο {reviewer.username} σε αξιολόγησε ({review.rating}/5)."
        )

    @action(detail=False, methods=['get'], url_path='of_user/(?P<user_id>[^/.]+)')
    def of_user(self, request, user_id=None):
        reviews = Review.objects.filter(reviewed_user_id=user_id).order_by('-created_at')[:5]
        return Response(self.get_serializer(reviews, many=True).data)
