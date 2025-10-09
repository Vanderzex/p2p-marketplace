from rest_framework import serializers
from .models import Transaction
from items.models import Item


class TransactionSerializer(serializers.ModelSerializer):
    requester_username = serializers.ReadOnlyField(source='requester.username')
    owner_username = serializers.ReadOnlyField(source='owner.username')
    item_title = serializers.ReadOnlyField(source='item.title')
    requested_item_title = serializers.ReadOnlyField(source='requested_item.title', default=None)

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
            'requester_username',
            'owner_username',
            'item_title',
            'requested_item_title',
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

        # --- Either (προαιρετικά, χωρίς περιορισμό) ---
        elif requested_type == 'either':
            pass

        return data
