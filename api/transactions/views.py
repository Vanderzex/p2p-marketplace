from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from django.db.models import Q
from .models import Transaction
from .serializers import TransactionSerializer
from items.models import Item


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για συναλλαγές (Ανταλλαγή / Δανεισμός / Ανταλλαγή ή Δανεισμός)
    Υποστηρίζει:
      - GET (λίστα / λεπτομέρειες)
      - POST (νέα συναλλαγή)
      - PATCH (αποδοχή / απόρριψη / ακύρωση)
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Φιλτράρει συναλλαγές σχετικές με τον χρήστη
    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(
            Q(requester=user) | Q(owner=user)
        ).order_by('-created_at')

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

        serializer.save(
            requester=requester,
            owner=item.owner,
            item=item,
            transaction_type=transaction_type
        )

    # Ενημέρωση κατάστασης (π.χ. αποδοχή, απόρριψη, ακύρωση)
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        data = request.data

        # Μόνο ο ιδιοκτήτης μπορεί να αποδεχτεί ή απορρίψει
        if instance.owner != user:
            return Response({'error': 'Δεν έχεις δικαίωμα αλλαγής κατάστασης.'},
                            status=status.HTTP_403_FORBIDDEN)

        new_status = data.get('status')
        if new_status not in ['accepted', 'rejected', 'cancelled']:
            return Response({'error': 'Μη έγκυρη κατάσταση.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Αν είναι αποδοχή — ελέγχουμε τον τύπο
        if new_status == 'accepted':

            # Περίπτωση "either": ο owner επιλέγει τύπο
            if instance.transaction_type == 'either':
                chosen_type = data.get('chosen_type')
                if chosen_type not in ['exchange', 'loan']:
                    return Response(
                        {'error': 'Πρέπει να επιλέξετε αν η συναλλαγή θα είναι ανταλλαγή ή δανεισμός.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                instance.transaction_type = chosen_type

            # Ανταλλαγή
            if instance.transaction_type == 'exchange':
                requested_item_id = data.get('requested_item_id')
                if not requested_item_id:
                    return Response({'error': 'Πρέπει να επιλέξετε αντικείμενο για ανταλλαγή.'},
                                    status=status.HTTP_400_BAD_REQUEST)

                try:
                    requested_item = Item.objects.get(id=requested_item_id, owner=instance.requester)
                except Item.DoesNotExist:
                    return Response({'error': 'Το αντικείμενο προς ανταλλαγή δεν βρέθηκε ή δεν ανήκει στον αιτούντα.'},
                                    status=status.HTTP_400_BAD_REQUEST)

                instance.requested_item = requested_item
                instance.item.available = False
                requested_item.available = False
                instance.item.save()
                requested_item.save()

            # Δανεισμός
            elif instance.transaction_type == 'loan':
                start_date = data.get('start_date')
                end_date = data.get('end_date')
                if not start_date or not end_date:
                    return Response({'error': 'Πρέπει να δηλωθεί διάρκεια δανεισμού (start_date, end_date).'},
                                    status=status.HTTP_400_BAD_REQUEST)
                instance.start_date = start_date
                instance.end_date = end_date
                instance.item.available = False
                instance.item.save()

        # Αποθήκευση κατάστασης
        instance.status = new_status
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
