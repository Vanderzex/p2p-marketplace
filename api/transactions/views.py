from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Transaction, Review
from .serializers import TransactionSerializer, ReviewSerializer
from items.models import Item
from notifications.models import Notification
import requests



class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για συναλλαγές (Ανταλλαγή / Δανεισμός)
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Εμφάνιση μόνο συναλλαγών που αφορούν τον χρήστη + υποστήριξη φίλτρου τύπου
    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.filter(
            Q(requester=user) | Q(owner=user)
        ).order_by('-created_at')

        filter_type = self.request.query_params.get('type')

        # Εισερχόμενες (προς εμένα)
        if filter_type == 'incoming':
            queryset = queryset.filter(
                owner=user,
                status__in=[
                    'pending',
                    'pending_confirmation',
                    'pending_terms',
                    'accepted',
                    'returned_by_requester'
                ]
            )

        # Εξερχόμενες (που έχω κάνει εγώ)
        elif filter_type == 'outgoing':
            queryset = queryset.filter(
                requester=user,
                status__in=[
                    'pending',
                    'pending_confirmation',
                    'pending_terms',
                    'accepted',
                    'returned_by_requester'
                ]
            )

        # Ιστορικό (ολοκληρωμένες / απορριφθείσες / ακυρωμένες)
        elif filter_type == 'history':
            queryset = queryset.filter(
                status__in=['completed', 'rejected', 'cancelled']
            )

        return queryset.distinct()

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

        existing_same_user = Transaction.objects.filter(
            requester=requester, item=item,
            status__in=['pending', 'accepted', 'pending_terms', 'pending_confirmation']
        ).exists()
        if existing_same_user:
            raise serializers.ValidationError({'error': 'Έχετε ήδη ενεργή αίτηση για αυτό το αντικείμενο.'})


        delivery_method = getattr(item, 'delivery_method', None)

        transaction = serializer.save(
            requester=requester,
            owner=item.owner,
            item=item,
            transaction_type=transaction_type,
            terms=item.terms or "",
            delivery_method=delivery_method
        )

        Notification.objects.create(
            user=item.owner,
            sender=requester,
            transaction=transaction,
            message=f"📩 Ο χρήστης {requester.username} ζήτησε συναλλαγή για το '{item.title}'."
        )

    # Πρόταση τοποθεσίας (με όνομα περιοχής + ειδοποίηση)
    @action(detail=True, methods=['post'])
    def propose_location(self, request, pk=None):
        tx = self.get_object()
        if tx.delivery_method not in ["in_person", "pickup_point"]:
            return Response({'error': 'Αυτός ο τρόπος παράδοσης δεν υποστηρίζει τοποθεσία.'},
                            status=status.HTTP_400_BAD_REQUEST)

        lat = request.data.get("lat")
        lng = request.data.get("lng")
        if not lat or not lng:
            return Response({'error': 'Απαιτούνται συντεταγμένες (lat, lng).'}, status=status.HTTP_400_BAD_REQUEST)

        tx.meeting_lat = float(lat)
        tx.meeting_lng = float(lng)
        tx.meeting_status = "proposed"

        # Προσπάθησε να αντλήσεις όνομα περιοχής (reverse geocoding)
        location_name = None
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=15&addressdetails=1"
            headers = {"User-Agent": "p2p-marketplace/1.0"}
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                location_name = data.get("display_name", None)
                if location_name:
                    tx.meeting_address = location_name
        except Exception:
            pass

        tx.save()

        # Ειδοποίηση στον άλλο χρήστη με τη διεύθυνση
        other_user = tx.owner if request.user == tx.requester else tx.requester
        location_text = f"📍 {location_name}" if location_name else f"📍 ({lat}, {lng})"
        Notification.objects.create(
            user=other_user,
            sender=request.user,
            transaction=tx,
            message=f"Ο {request.user.username} πρότεινε σημείο συνάντησης στο {location_text}."
        )

        return Response(TransactionSerializer(tx).data, status=status.HTTP_200_OK)

    # Ενημέρωση κατάστασης (Partial Update)
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
            other_active = Transaction.objects.filter(
                item=instance.item,
                status__in=['accepted','pending_terms']
            ).exclude(pk=instance.pk).exists()

            if other_active:
                return Response(
                    {'error': 'Υπάρχει ήδη αποδεκτή συναλλαγή για αυτό το αντικείμενο.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if instance.transaction_type == 'exchange' and instance.requested_item:
                other_active_requested = Transaction.objects.filter(
                    Q(item=instance.requested_item) | Q(requested_item=instance.requested_item),
                    status__in=['accepted', 'pending_terms']
                    ).exclude(pk=instance.pk).exists()

                if other_active_requested:
                    return Response(
                        {'error': 'Το αντικείμενο που προσφέρεις συμμετέχει ήδη σε αποδεκτή συναλλαγή.'},
                        status=status.HTTP_400_BAD_REQUEST
                         )

            if instance.transaction_type == 'loan':
                start_date = data.get('start_date')
                end_date = data.get('end_date')
                if not start_date or not end_date:
                    return Response({'error': 'Πρέπει να δηλωθεί διάρκεια δανεισμού.'}, status=status.HTTP_400_BAD_REQUEST)
                instance.start_date = start_date
                instance.end_date = end_date

            instance.item.available = False
            instance.item.save()

            if instance.transaction_type == 'exchange' and instance.requested_item:
                instance.requested_item.available = False
                instance.requested_item.save()

            if data.get('terms'):
                instance.terms = data['terms']
                instance.status = 'pending_terms'
            else:
                instance.status = 'accepted'

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

        elif new_status == 'cancelled':
            instance.status = 'cancelled'

            has_other_active_main = Transaction.objects.filter(
                item=instance.item,
                status__in=['accepted', 'pending_terms']
                ).exclude(pk=instance.pk).exists()

            if not has_other_active_main:
                instance.item.available = True
                instance.item.save()

            if instance.transaction_type == 'exchange' and instance.requested_item:
                has_other_active_req = Transaction.objects.filter(
                    Q(item=instance.requested_item) | Q(requested_item=instance.requested_item),
                    status__in=['accepted', 'pending_terms']
                     ).exclude(pk=instance.pk).exists()

                if not has_other_active_req:
                    instance.requested_item.available = True
                    instance.requested_item.save()

            Notification.objects.create(
                user=instance.requester,
                sender=user,
                transaction=instance,
                message=f"ℹ️ Ο {user.username} ακύρωσε τη συναλλαγή."
             )


        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # Επιλογή αντικειμένου ανταλλαγής
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
            selected_item = Item.objects.get(
                id=selected_item_id,
                owner=tx.requester,
                available=True,
                transaction_type__in=['exchange', 'either']
            )
        except Item.DoesNotExist:
            return Response({'error': 'Το αντικείμενο δεν βρέθηκε ή δεν είναι διαθέσιμο για ανταλλαγή.'},
                            status=status.HTTP_400_BAD_REQUEST)

        tx.requested_item = selected_item
        tx.status = 'pending_confirmation'
        tx.save()

        Notification.objects.create(
            user=tx.requester,
            sender=user,
            transaction=tx,
            message=f"🔁 Ο {user.username} πρότεινε ανταλλαγή με το '{selected_item.title}'."
        )

        return Response({'message': '✅ Επιλέχθηκε αντικείμενο για ανταλλαγή.'})

    # Επιβεβαίωση ανταλλαγής
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

        Notification.objects.create(
            user=tx.owner,
            sender=user,
            transaction=tx,
            message=f"✅ Ο {user.username} αποδέχθηκε την ανταλλαγή για '{tx.item.title}'."
        )

        return Response({'message': '✅ Η ανταλλαγή επιβεβαιώθηκε!'})

    # Δήλωση επιστροφής (loan)
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

        Notification.objects.create(
            user=tx.owner,
            sender=user,
            transaction=tx,
            message=f"↩️ Ο {user.username} δήλωσε επιστροφή για '{tx.item.title}'."
        )

        return Response({'message': '✅ Δήλωσες ότι επέστρεψες το αντικείμενο.'})

    # Επιβεβαίωση αποστολής (ισχύει για owner ή requester ανάλογα με τη συναλλαγή)
    @action(detail=True, methods=['post'])
    def mark_shipped(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.delivery_method != "shipping":
            return Response(
                {'error': 'Αυτός ο τύπος συναλλαγής δεν χρησιμοποιεί courier.'},
                status=400
            )

        # Ανάλογα με το ρόλο του χρήστη
        if user == tx.owner:
            tx.owner_shipped = True
        elif user == tx.requester:
            tx.requester_shipped = True
        else:
            return Response(
                {'error': 'Δεν συμμετέχεις σε αυτή τη συναλλαγή.'},
                status=403
            )

        tx.save()

        # Ειδοποίηση στον άλλο χρήστη
        other = tx.requester if user == tx.owner else tx.owner
        Notification.objects.create(
            user=other,
            sender=user,
            transaction=tx,
            message=f"📦 Ο {user.username} επιβεβαίωσε αποστολή για '{tx.item.title}'."
        )

        # Αν και οι δύο έχουν αποστείλει, ειδοποίησε και τους δύο
        if tx.owner_shipped and tx.requester_shipped:
            Notification.objects.create(
                user=tx.owner,
                sender=None,
                transaction=tx,
                message="📦 Και οι δύο πλευρές έχουν αποστείλει τα αντικείμενα. Μπορείτε να επιβεβαιώσετε παραλαβή!"
            )
            Notification.objects.create(
                user=tx.requester,
                sender=None,
                transaction=tx,
                message="📦 Και οι δύο πλευρές έχουν αποστείλει τα αντικείμενα. Μπορείτε να επιβεβαιώσετε παραλαβή!"
            )

        serializer = self.get_serializer(tx)
        return Response(serializer.data, status=200)


    # Επιβεβαίωση παραλαβής (ισχύει για owner ή requester)
    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        if tx.delivery_method != "shipping":
            return Response({'error': 'Αυτός ο τύπος συναλλαγής δεν χρησιμοποιεί courier.'}, status=400)

        if user == tx.owner:
            tx.owner_received = True
        elif user == tx.requester:
            tx.requester_received = True
        else:
            return Response({'error': 'Δεν συμμετέχεις σε αυτή τη συναλλαγή.'}, status=403)

        # Αν και οι δύο έχουν παραλάβει → ολοκλήρωση
        if tx.owner_received and tx.requester_received:
            tx.status = "completed"
            tx.returned_at = timezone.now()
            if tx.transaction_type == "exchange" and tx.item and tx.requested_item:
                old_owner_1, old_owner_2 = tx.item.owner, tx.requested_item.owner
                tx.item.owner, tx.requested_item.owner = old_owner_2, old_owner_1
                tx.item.available = True
                tx.requested_item.available = True
                tx.item.save()
                tx.requested_item.save()
            elif tx.transaction_type == "loan":
                tx.item.available = True
                tx.item.save()

            for u in [tx.owner, tx.requester]:
                Notification.objects.create(
                    user=u,
                    sender=user,
                    transaction=tx,
                    message=f"🏁 Η συναλλαγή '{tx.item.title}' ολοκληρώθηκε επιτυχώς μέσω courier!"
                )

        tx.save()
        serializer = self.get_serializer(tx)
        return Response(serializer.data, status=200)

    # Διπλή Ολοκλήρωση + επιβεβαίωση επιστροφής
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        tx = self.get_object()
        user = request.user

        # Αν πρόκειται για δανεισμό και ο αιτών έχει δηλώσει επιστροφή → ο owner ολοκληρώνει
        if tx.transaction_type == 'loan' and tx.status == 'returned_by_requester' and user == tx.owner:
            tx.status = 'completed'
            tx.returned_at = timezone.now()
            if tx.item:
                tx.item.available = True
                tx.item.save()

            Notification.objects.create(
                user=tx.requester,
                sender=user,
                transaction=tx,
                message=f"✅ Ο {user.username} επιβεβαίωσε την επιστροφή του '{tx.item.title}'. Η συναλλαγή ολοκληρώθηκε!"
            )
            Notification.objects.create(
                user=tx.owner,
                sender=user,
                transaction=tx,
                message=f"🏁 Ολοκληρώθηκε επιτυχώς ο δανεισμός για '{tx.item.title}'."
            )
            tx.save()
            return Response(TransactionSerializer(tx).data)

        # Κανονική διπλή ολοκλήρωση
        if user == tx.owner:
            tx.owner_completed = True
        elif user == tx.requester:
            tx.requester_completed = True
        else:
            return Response({'error': 'Δεν συμμετέχεις σε αυτή τη συναλλαγή.'},
                            status=status.HTTP_403_FORBIDDEN)

        if tx.owner_completed and tx.requester_completed:
            tx.status = 'completed'
            tx.returned_at = timezone.now()
            tx.end_date = timezone.now()

            if tx.transaction_type == 'exchange' and tx.item and tx.requested_item:
                old_owner_1 = tx.item.owner
                old_owner_2 = tx.requested_item.owner
                tx.item.owner = old_owner_2
                tx.requested_item.owner = old_owner_1
                tx.item.available = True
                tx.requested_item.available = True
                tx.item.save()
                tx.requested_item.save()
            elif tx.transaction_type == 'loan' and tx.item:
                tx.item.available = True
                tx.item.save()

            for u in [tx.owner, tx.requester]:
                Notification.objects.create(
                    user=u,
                    sender=user,
                    transaction=tx,
                    message=f"🏁 Η συναλλαγή '{tx.item.title}' ολοκληρώθηκε επιτυχώς!"
                )
        else:
            other_user = tx.owner if user == tx.requester else tx.requester
            Notification.objects.create(
                user=other_user,
                sender=user,
                transaction=tx,
                message=f"🕒 Ο {user.username} δήλωσε ότι ολοκλήρωσε τη συναλλαγή για '{tx.item.title}'."
            )

        tx.save()
        return Response(TransactionSerializer(tx).data)

    # Προβολή συναλλαγών άλλου χρήστη
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
            raise serializers.ValidationError({"error": "Η συναλλαγή δεν έχει ολοκληρωθεί ακόμα."})

        reviewed_user = tx.owner if reviewer == tx.requester else tx.requester
        serializer.save(reviewer=reviewer, reviewed_user=reviewed_user)

    @action(detail=False, methods=["get"], url_path=r"of_user/(?P<user_id>\d+)")
    def of_user(self, request, user_id=None):
        reviews = Review.objects.filter(reviewed_user__id=user_id).order_by('-created_at')
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
