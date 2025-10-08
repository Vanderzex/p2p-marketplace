from rest_framework import serializers
from .models import Transaction
from items.models import Item

class TransactionSerializer(serializers.ModelSerializer):
    requester_username = serializers.ReadOnlyField(source='requester.username')
    owner_username = serializers.ReadOnlyField(source='owner.username')
    item_title = serializers.ReadOnlyField(source='item.title')

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['requester', 'owner', 'status', 'created_at']
