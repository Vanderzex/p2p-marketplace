from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    item = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "message",
            "type",
            "transaction",
            "item",
            "sender_username",
            "is_read",
            "created_at",
        ]
