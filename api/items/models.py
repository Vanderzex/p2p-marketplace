from django.db import models
from django.contrib.auth import get_user_model
from django.utils.timezone import now

User = get_user_model()


class Item(models.Model):
    TRANSACTION_CHOICES = [
        ('exchange', 'Ανταλλαγή'),
        ('loan', 'Δανεισμός'),
        ('either', 'Ανταλλαγή ή Δανεισμός'),
    ]

    # Κατηγορίες αντικειμένων
    CATEGORY_CHOICES = [
        ('electronics', 'Ηλεκτρονικά'),
        ('books', 'Βιβλία'),
        ('clothing', 'Ρούχα'),
        ('furniture', 'Έπιπλα'),
        ('sports', 'Αθλητικά'),
        ('tools', 'Εργαλεία'),
        ('other', 'Άλλο'),
    ]

    DELIVERY_CHOICES = [
        ('in_person', 'Χέρι με χέρι'),
        ('shipping', 'Αποστολή με courier'),
        ('pickup_point', 'Σημείο συνάντησης'),
        ('other', 'Άλλο'),
    ]

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_CHOICES,
        default='exchange',
        verbose_name="Τύπος συναλλαγής"
    )

    # ΝΕΟ ΠΕΔΙΟ: Κατηγορία αντικειμένου
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='other',
        verbose_name="Κατηγορία"
    )

    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    main_image = models.ImageField(upload_to='item_images/', blank=True, null=True)

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Ιδιοκτήτης"
    )

    terms = models.TextField(
        blank=True,
        null=True,
        verbose_name="Προεπιλεγμένοι Όροι Διάθεσης"
    )

    delivery_method = models.CharField(
        max_length=20,
        choices=DELIVERY_CHOICES,
        default='in_person',
        verbose_name="Τρόπος Παράδοσης"
    )

    def __str__(self):
        # Εμφανίζει και την κατηγορία για πιο καθαρή περιγραφή
        return f"{self.title} ({self.get_category_display()} - {self.get_transaction_type_display()})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Αντικείμενο"
        verbose_name_plural = "Αντικείμενα"


class ItemImage(models.Model):
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
