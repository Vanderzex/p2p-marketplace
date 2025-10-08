from django.db import models
from django.contrib.auth import get_user_model
from django.utils.timezone import now

User = get_user_model()

class Item(models.Model):
    TRANSACTION_CHOICES = [
        ('exchange', 'Ανταλλαγή'),
        ('loan', 'Δανεισμός'),
    ]

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_CHOICES,
        default='exchange',
        verbose_name="Τύπος συναλλαγής"
    )
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    main_image = models.ImageField(upload_to='item_images/', blank=True, null=True)

    # Καθένα αντικείμενο ανήκει σε έναν χρήστη (owner)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Ιδιοκτήτης"
    )

    def __str__(self):
        return f"{self.title} ({self.get_transaction_type_display()})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Αντικείμενο"
        verbose_name_plural = "Αντικείμενα"


class ItemImage(models.Model):
    # Συνδέεται με ένα αντικείμενο (πολλές φωτογραφίες ανά item)
    item = models.ForeignKey(
        Item,
        related_name="images",
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to="item_images/")
    uploaded_at = models.DateTimeField(default=now)

    def __str__(self):
        return f"Εικόνα για {self.item.title}"

    class Meta:
        verbose_name = "Εικόνα αντικειμένου"
        verbose_name_plural = "Εικόνες αντικειμένων"
