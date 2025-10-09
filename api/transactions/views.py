from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Transaction
from .serializers import TransactionSerializer
from items.models import Item


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για συναλλαγές (Ανταλλαγή / Δανεισμός)
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ✅ Εμφάνιση μόνο συναλλαγών που αφορούν τον χρήστη
    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(
            Q(requester=user) | Q(owner=user)
        ).order_by('-created_at')

    # ✅ Δημιουργία νέας συναλλαγής
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

        # Έλεγχος για ήδη ενεργό αίτημα
        existing_same_user = Transaction.objects.filter(
            requester=requester, item=item,
            status__in=['pending', 'accepted', 'pending_terms', 'pending_confirmation']
        ).exists()
        if existing_same_user:
            raise serializers.ValidationError({'error': 'Έχετε ήδη ενεργή αίτηση για αυτό το αντικείμενο.'})

        # Έλεγχος για ενεργή συναλλαγή με οποιονδήποτε
        active_for_item = Transaction.objects.filter(
            item=item, status__in=['pending', 'accepted', 'pending_terms', 'pending_confirmation']
        ).exists()
        if active_for_item:
            raise serializers.ValidationError({'error': 'Το αντικείμενο έχει ήδη ενεργή συναλλαγή.'})

        serializer.save(
            requester=requester,
            owner=item.owner,
            item=item,
            transaction_type=transaction_type,
            terms=item.terms or ""
        )

    # ✅ Ενημέρωση κατάστασης (π.χ. αποδοχή / απόρριψη δανεισμού)
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        data = request.data

        if instance.owner != user:
            return Response({'error': 'Δεν έχεις δικαίωμα αλλαγής κατάστασης.'},
                            status=status.HTTP_403_FORBIDDEN)

        new_status = data.get('status')
        if new_status not in ['accepted', 'rejected', 'cancelled', 'pending_terms']:
            return Response({'error': 'Μη έγκυρη κατάσταση.'}, status=status.HTTP_400_BAD_REQUEST)

        # Αν είναι αποδοχή δανεισμού
        if new_status in ['accepted', 'pending_terms']:
            if instance.transaction_type == 'loan':
                start_date = data.get('start_date')
                end_date = data.get('end_date')
                if not start_date or not end_date:
                    return Response({'error': 'Πρέπει να δηλωθεί διάρκεια δανεισμού.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                instance.start_date = start_date
                instance.end_date = end_date
                instance.item.available = False
                instance.item.save()

            if data.get('terms'):
                instance.terms = data['terms']
                instance.status = 'pending_terms'
            else:
                instance.status = 'accepted'

        else:
            instance.status = new_status

        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # ✅ Ο ιδιοκτήτης επιλέγει αντικείμενο του αιτούντα για ανταλλαγή
    @action(detail=True, methods=['post'])
    def select_exchange_item(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.owner != user:
            return Response({'error': 'Δεν έχεις δικαίωμα σε αυτή τη συναλλαγή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.transaction_type != 'exchange':
            return Response({'error': 'Η συναλλαγή δεν είναι τύπου ανταλλαγής.'},
                            status=status.HTTP_400_BAD_REQUEST)

        selected_item_id = request.data.get('selected_item_id')
        if not selected_item_id:
            return Response({'error': 'Πρέπει να επιλέξεις αντικείμενο του αιτούντος.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            selected_item = Item.objects.get(id=selected_item_id, owner=transaction.requester)
        except Item.DoesNotExist:
            return Response({'error': 'Το αντικείμενο δεν βρέθηκε ή δεν ανήκει στον αιτούντα.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not selected_item.available:
            return Response({'error': 'Το αντικείμενο που επέλεξες δεν είναι διαθέσιμο.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # ✅ Ο ιδιοκτήτης αποδέχθηκε — περιμένουμε επιβεβαίωση από τον αιτούντα
        transaction.requested_item = selected_item
        transaction.status = 'pending_confirmation'
        transaction.save()

        return Response({
            'message': '✅ Επιλέχθηκε αντικείμενο για ανταλλαγή. Αναμένεται αποδοχή ή απόρριψη από τον αιτούντα.'
        }, status=status.HTTP_200_OK)

    # ❌ Ο ιδιοκτήτης απορρίπτει το αίτημα ανταλλαγής
    @action(detail=True, methods=['post'])
    def owner_reject_exchange(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.owner != user:
            return Response({'error': 'Μόνο ο ιδιοκτήτης μπορεί να απορρίψει αυτή την αίτηση.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.transaction_type != 'exchange':
            return Response({'error': 'Η συναλλαγή δεν είναι τύπου ανταλλαγής.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if transaction.status != 'pending':
            return Response({'error': 'Η συναλλαγή δεν βρίσκεται σε εκκρεμότητα.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction.status = 'rejected'
        transaction.save()

        return Response({'message': '❌ Η αίτηση ανταλλαγής απορρίφθηκε από τον ιδιοκτήτη.'},
                        status=status.HTTP_200_OK)

    # ✅ Ο αιτών αποδέχεται την πρόταση ανταλλαγής
    @action(detail=True, methods=['post'])
    def confirm_exchange(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.requester != user:
            return Response({'error': 'Μόνο ο αιτών μπορεί να αποδεχθεί την ανταλλαγή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.transaction_type != 'exchange':
            return Response({'error': 'Η συναλλαγή δεν είναι τύπου ανταλλαγής.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if transaction.status != 'pending_confirmation':
            return Response({'error': 'Δεν υπάρχει εκκρεμής πρόταση για επιβεβαίωση.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction.status = 'accepted'
        transaction.item.available = False
        transaction.requested_item.available = False
        transaction.item.save()
        transaction.requested_item.save()
        transaction.save()

        return Response({'message': '✅ Αποδέχθηκες την ανταλλαγή! Η συναλλαγή είναι πλέον ενεργή.'})

    # 🚫 Ο αιτών απορρίπτει την πρόταση ανταλλαγής
    @action(detail=True, methods=['post'])
    def reject_exchange(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.requester != user:
            return Response({'error': 'Μόνο ο αιτών μπορεί να απορρίψει την ανταλλαγή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.transaction_type != 'exchange':
            return Response({'error': 'Η συναλλαγή δεν είναι τύπου ανταλλαγής.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if transaction.status != 'pending_confirmation':
            return Response({'error': 'Δεν υπάρχει εκκρεμής πρόταση προς απόρριψη.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction.status = 'rejected'
        transaction.save()
        return Response({'message': '🚫 Η ανταλλαγή απορρίφθηκε από τον αιτούντα.'})

    # ✅ Ο αιτών δηλώνει ότι επέστρεψε αντικείμενο (μόνο για loan)
    @action(detail=True, methods=['post'])
    def confirm_return(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.requester != user:
            return Response({'error': 'Μόνο ο αιτών μπορεί να δηλώσει επιστροφή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.transaction_type != 'loan':
            return Response({'error': 'Η λειτουργία ισχύει μόνο για δανεισμό.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if transaction.status != 'accepted':
            return Response({'error': 'Η συναλλαγή δεν είναι ενεργή.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction.status = 'returned_by_requester'
        transaction.returned_at = timezone.now()
        transaction.save()

        return Response({'message': '✅ Δήλωσες ότι επέστρεψες το αντικείμενο.'}, status=status.HTTP_200_OK)

    # ✅ Τελική επιβεβαίωση (ολοκλήρωση)
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        transaction = self.get_object()
        user = request.user

        if transaction.owner != user:
            return Response({'error': 'Μόνο ο ιδιοκτήτης μπορεί να ολοκληρώσει τη συναλλαγή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if transaction.status not in ['accepted', 'returned_by_requester']:
            return Response({'error': 'Δεν υπάρχει ενεργή συναλλαγή προς ολοκλήρωση.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if transaction.transaction_type == 'exchange':
            if transaction.item:
                transaction.item.available = True
                transaction.item.save()
            if transaction.requested_item:
                transaction.requested_item.available = True
                transaction.requested_item.save()

        elif transaction.transaction_type == 'loan':
            transaction.item.available = True
            transaction.item.save()

        transaction.status = 'completed'
        transaction.returned_at = timezone.now()
        transaction.save()

        return Response({'message': '✅ Η συναλλαγή ολοκληρώθηκε επιτυχώς.'})
