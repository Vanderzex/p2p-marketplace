from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .models import Item, ItemImage
from .serializers import ItemSerializer, ItemImageSerializer
from .permissions import IsOwnerOrReadOnly
from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by('-created_at')
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # 📸 Ανέβασμα επιπλέον εικόνας
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_image(self, request, pk=None):
        item = self.get_object()

        if item.owner != request.user:
            return Response({'detail': 'Δεν είσαι ο ιδιοκτήτης αυτού του αντικειμένου.'},
                            status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get('image')
        if not image:
            return Response({'detail': 'Δεν στάλθηκε καμία εικόνα.'},
                            status=status.HTTP_400_BAD_REQUEST)

        ItemImage.objects.create(item=item, image=image)
        return Response({'detail': 'Η εικόνα ανέβηκε επιτυχώς!'},
                        status=status.HTTP_201_CREATED)

    # 🔍 Προβολή όλων των συναλλαγών ενός αντικειμένου
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def transactions(self, request, pk=None):
        item = self.get_object()
        transactions = Transaction.objects.filter(item=item)
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    # Λίστα με τα αντικείμενα του συνδεδεμένου χρήστη
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_items(self, request):
        """Επιστρέφει όλα τα διαθέσιμα αντικείμενα του συνδεδεμένου χρήστη"""
        items = Item.objects.filter(owner=request.user, available=True)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    # Λίστα με αντικείμενα συγκεκριμένου χρήστη (με username)
    @action(
        detail=False,
        methods=['get'],
        url_path=r'of_user/(?P<username>[\w.@+-]+)',
        permission_classes=[permissions.AllowAny    ],
    )
    def of_user(self, request, username=None):
        """Επιστρέφει όλα τα διαθέσιμα αντικείμενα του χρήστη με username=<username>"""
        User = get_user_model()
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'Ο χρήστης δεν βρέθηκε.'},
                            status=status.HTTP_404_NOT_FOUND)

        items = Item.objects.filter(owner=target_user, available=True)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    # Δημιουργία νέας συναλλαγής (ανταλλαγή ή δανεισμός)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_transaction(self, request, pk=None):
        item = self.get_object()

        if not item.available:
            return Response({'detail': 'Το αντικείμενο δεν είναι διαθέσιμο.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if item.owner == request.user:
            return Response({'detail': 'Δεν μπορείς να κάνεις συναλλαγή με το δικό σου αντικείμενο.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction_type = request.data.get('transaction_type', item.transaction_type)
        message = request.data.get('message', '')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        terms = request.data.get('terms', '')
        borrower_accepted_terms = request.data.get('borrower_accepted_terms', False)

        requested_item_id = request.data.get('requested_item')
        requested_item = None
        if transaction_type == 'exchange':
            if not requested_item_id:
                return Response({'detail': 'Πρέπει να επιλέξεις αντικείμενο για ανταλλαγή.'},
                                status=status.HTTP_400_BAD_REQUEST)
            try:
                requested_item = Item.objects.get(id=requested_item_id, owner=request.user)
            except Item.DoesNotExist:
                return Response({'detail': 'Το επιλεγμένο αντικείμενο δεν βρέθηκε ή δεν σου ανήκει.'},
                                status=status.HTTP_400_BAD_REQUEST)

            if requested_item.id == item.id:
                return Response({'detail': 'Δεν μπορείς να ανταλλάξεις το ίδιο αντικείμενο με τον εαυτό του.'},
                                status=status.HTTP_400_BAD_REQUEST)
            if not requested_item.available:
                return Response({'detail': 'Το αντικείμενο που προσφέρεις δεν είναι διαθέσιμο.'},
                                status=status.HTTP_400_BAD_REQUEST)

        transaction = Transaction.objects.create(
            item=item,
            requested_item=requested_item,
            requester=request.user,
            owner=item.owner,
            transaction_type=transaction_type,
            message=message,
            start_date=start_date if transaction_type == 'loan' else None,
            end_date=end_date if transaction_type == 'loan' else None,
            terms=terms if transaction_type == 'loan' else None,
            borrower_accepted_terms=borrower_accepted_terms if transaction_type == 'loan' else False,
        )

        serializer = TransactionSerializer(transaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    #  Αλλαγή διαθεσιμότητας
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def set_availability(self, request, pk=None):
        item = self.get_object()
        if item.owner != request.user:
            return Response({'detail': 'Δεν έχεις δικαίωμα να τροποποιήσεις αυτό το αντικείμενο.'},
                            status=status.HTTP_403_FORBIDDEN)

        available = request.data.get('available')
        if available is None:
            return Response({'detail': 'Λείπει το πεδίο available.'},
                            status=status.HTTP_400_BAD_REQUEST)

        item.available = bool(available)
        item.save()
        return Response({'detail': f'Η διαθεσιμότητα ενημερώθηκε σε {item.available}.'})
