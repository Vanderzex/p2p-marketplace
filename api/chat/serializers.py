from rest_framework import serializers
from .models import Message

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    receiver_username = serializers.ReadOnlyField(source='receiver.username')
    item_title = serializers.ReadOnlyField(source='item.title')
    item_id = serializers.ReadOnlyField(source='item.id')

    class Meta:
        model = Message
        fields = [
            'id',
            'sender',
            'sender_username',
            'receiver',
            'receiver_username',
            'transaction',
            'item',
            'item_id',
            'item_title',
            'text',
            'created_at',
            'is_read',
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']
