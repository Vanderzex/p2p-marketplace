from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Item, ItemImage
from .serializers import ItemSerializer, ItemImageSerializer
from .permissions import IsOwnerOrReadOnly

# ➕ Εισάγουμε τα Transactions
from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by('-created_at')
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    #  Endpoint για ανέβασμα επιπλέον εικόνας
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_image(self, request, pk=None):
        item = self.get_object()

        if item.owner != request.user:
            return Response({'detail': ' Δεν είσαι ο ιδιοκτήτης αυτού του αντικειμένου.'},
                            status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get('image')
        if not image:
            return Response({'detail': ' Δεν στάλθηκε καμία εικόνα.'},
                            status=status.HTTP_400_BAD_REQUEST)

        ItemImage.objects.create(item=item, image=image)
        return Response({'detail': ' Εικόνα ανέβηκε επιτυχώς!'},
                        status=status.HTTP_201_CREATED)

    #  Προβολή όλων των συναλλαγών που σχετίζονται με ένα συγκεκριμένο item
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def transactions(self, request, pk=None):
        item = self.get_object()
        transactions = Transaction.objects.filter(item=item)
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    # Δημιουργία νέας συναλλαγής (π.χ. ο χρήστης κάνει αίτημα ανταλλαγής ή δανεισμού)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_transaction(self, request, pk=None):
        item = self.get_object()

        # Αντικείμενο μη διαθέσιμο
        if not item.available:
            return Response({'detail': ' Το αντικείμενο δεν είναι διαθέσιμο.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Μη επιτρέπουμε συναλλαγή με τον εαυτό μας
        if item.owner == request.user:
            return Response({'detail': ' Δεν μπορείς να κάνεις συναλλαγή με το δικό σου αντικείμενο.'},
                            status=status.HTTP_400_BAD_REQUEST)

        transaction_type = request.data.get('transaction_type', item.transaction_type)
        message = request.data.get('message', '')

        # Δημιουργία νέας συναλλαγής
        transaction = Transaction.objects.create(
            item=item,
            sender=request.user,
            receiver=item.owner,
            transaction_type=transaction_type,
            message=message,
        )

        serializer = TransactionSerializer(transaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # (Προαιρετικά) Endpoint για αλλαγή διαθεσιμότητας
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def set_availability(self, request, pk=None):
        item = self.get_object()
        if item.owner != request.user:
            return Response({'detail': ' Δεν έχεις δικαίωμα να τροποποιήσεις αυτό το αντικείμενο.'},
                            status=status.HTTP_403_FORBIDDEN)

        available = request.data.get('available')
        if available is None:
            return Response({'detail': ' Λείπει το πεδίο available.'},
                            status=status.HTTP_400_BAD_REQUEST)

        item.available = bool(available)
        item.save()
        return Response({'detail': f' Η διαθεσιμότητα ενημερώθηκε σε {item.available}.'})
