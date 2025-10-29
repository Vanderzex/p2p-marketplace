from django.db import models
from django.contrib.auth import get_user_model
from transactions.models import Transaction
from items.models import Item

User = get_user_model()

class Notification(models.Model):
    TYPE_CHOICES = [
        ("message", "Μήνυμα"),
        ("transaction", "Συναλλαγή"),
    ]

    # Ο χρήστης που λαμβάνει την ειδοποίηση
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")

    # Ο αποστολέας (π.χ. αυτός που έστειλε μήνυμα ή αίτημα)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_notifications", null=True, blank=True)

    # Συναλλαγή (προαιρετικά, μπορεί να μην συνδέεται πάντα)
    transaction = models.ForeignKey(
        Transaction, null=True, blank=True, on_delete=models.SET_NULL
    )

    # Τύπος ειδοποίησης
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="message")

    # Κείμενο ειδοποίησης
    message = models.CharField(max_length=255)

    # Διαβασμένη ή όχι
    is_read = models.BooleanField(default=False)

    # Ημερομηνία δημιουργίας
    created_at = models.DateTimeField(auto_now_add=True)

    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_type_display()}] {self.user.username}: {self.message[:40]}"
