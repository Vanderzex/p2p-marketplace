from rest_framework import serializers
from .models import Transaction, Review
from users.serializers import UserSerializer  # ✅ για nested owner/requester
from items.serializers import ItemSerializer


from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.SerializerMethodField()
    reviewed_user = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id',
            'transaction',
            'reviewer',
            'reviewed_user',
            'rating',
            'comment',
            'created_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewed_user', 'created_at']

    # Επιστρέφει τα βασικά στοιχεία του reviewer
    def get_reviewer(self, obj):
        if obj.reviewer:
            return {
                "id": obj.reviewer.id,
                "username": obj.reviewer.username,
                "email": obj.reviewer.email,
            }
        return None

    # Επιστρέφει τα βασικά στοιχεία του χρήστη που αξιολογείται
    def get_reviewed_user(self, obj):
        if obj.reviewed_user:
            return {
                "id": obj.reviewed_user.id,
                "username": obj.reviewed_user.username,
                "email": obj.reviewed_user.email,
            }
        return None


class TransactionSerializer(serializers.ModelSerializer):
    # Nested user info ώστε React να διαβάζει tx.owner.username / tx.requester.username
    owner = UserSerializer(read_only=True)
    requester = UserSerializer(read_only=True)

    # Εμφάνιση τίτλων αντικειμένων
    item_title = serializers.ReadOnlyField(source='item.title')
    requested_item_title = serializers.ReadOnlyField(source='requested_item.title', default=None)

    # Nested reviews
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'requester',
            'owner',
            'item',
            'requested_item',
            'transaction_type',
            'message',
            'status',
            'start_date',
            'end_date',
            'terms',
            'borrower_accepted_terms',
            'created_at',
            'returned_at',
            # helper fields
            'item_title',
            'requested_item_title',
            # reviews
            'reviews',
        ]
        read_only_fields = [
            'id',
            'requester',
            'owner',
            'status',
            'created_at',
            'returned_at',
        ]

    def validate(self, data):
        """
        Ελέγχει:
        - ότι ο τύπος συναλλαγής (loan/exchange) επιτρέπεται από το Item
        - ότι ημερομηνίες & όροι υπάρχουν ΜΟΝΟ για loan
        """
        item = data.get('item') or getattr(self.instance, 'item', None)
        requested_type = data.get('transaction_type') or getattr(self.instance, 'transaction_type', None)

        # --- Έλεγχος τύπου αντικειμένου ---
        if item and requested_type:
            item_type = item.transaction_type

            if item_type != 'either' and item_type != requested_type:
                raise serializers.ValidationError({
                    "transaction_type": f"Το αντικείμενο '{item.title}' δεν υποστηρίζει '{requested_type}' συναλλαγή (επιτρέπεται μόνο '{item_type}')."
                })

        # --- Λογική για Loan ---
        if requested_type == 'loan':
            start = data.get('start_date') or getattr(self.instance, 'start_date', None)
            end = data.get('end_date') or getattr(self.instance, 'end_date', None)

            if not start or not end:
                raise serializers.ValidationError({
                    "start_date": "Πρέπει να οριστούν ημερομηνίες για δανεισμό.",
                    "end_date": "Πρέπει να οριστούν ημερομηνίες για δανεισμό."
                })

            if start > end:
                raise serializers.ValidationError({
                    "end_date": "Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη."
                })

        # --- Λογική για Exchange ---
        elif requested_type == 'exchange':
            if data.get('start_date') or data.get('end_date') or data.get('terms'):
                raise serializers.ValidationError({
                    "transaction_type": "Δεν επιτρέπονται ημερομηνίες ή όροι για ανταλλαγή."
                })
            # Καθαρίζουμε τα πεδία για ασφάλεια
            data['start_date'] = None
            data['end_date'] = None
            data['terms'] = None
            data['borrower_accepted_terms'] = False

        # --- Either (χωρίς περιορισμό) ---
        elif requested_type == 'either':
            pass

        return data
