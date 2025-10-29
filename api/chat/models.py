from django.db import models
from django.contrib.auth import get_user_model
from transactions.models import Transaction
from items.models import Item

User = get_user_model()

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender} → {self.receiver}: {self.text[:40]}"
