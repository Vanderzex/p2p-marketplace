from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from items.models import Item
from math import radians, sin, cos, sqrt, atan2


class Transaction(models.Model):
    """
    Μοντέλο που αναπαριστά μια συναλλαγή (ανταλλαγή ή δανεισμό)
    μεταξύ δύο χρηστών για ένα συγκεκριμένο αντικείμενο.
    """

    STATUS_CHOICES = [
        ('pending', 'Σε εκκρεμότητα'),
        ('pending_terms', 'Εκκρεμεί αποδοχή όρων'),
        ('pending_confirmation', 'Εκκρεμεί επιβεβαίωση'),
        ('accepted', 'Ενεργή'),
        ('rejected', 'Απορριφθείσα'),
        ('cancelled', 'Ακυρωμένη'),
        ('completed', 'Ολοκληρωμένη'),
    ]

    TRANSACTION_TYPE_CHOICES = [
        ('exchange', 'Ανταλλαγή'),
        ('loan', 'Δανεισμός'),
        ('either', 'Ανταλλαγή ή Δανεισμός'),
    ]


    # Ο χρήστης που ζητά τη συναλλαγή
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_transactions',
        verbose_name="Αιτών"
    )

    # Ο ιδιοκτήτης του αντικειμένου
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_transactions',
        verbose_name="Ιδιοκτήτης"
    )

    # Το αντικείμενο που ζητείται (ανήκει στον ιδιοκτήτη)
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name="Αντικείμενο"
    )

    # Το αντικείμενο που προσφέρει ο αιτών (μόνο για ανταλλαγές)
    requested_item = models.ForeignKey(
        Item,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exchange_offers',
        verbose_name="Αντικείμενο προς ανταλλαγή"
    )

    # Είδος συναλλαγής
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPE_CHOICES,
        verbose_name="Τύπος συναλλαγής"
    )


    # Προαιρετικό μήνυμα από τον αιτούντα
    message = models.TextField(blank=True, verbose_name="Μήνυμα")

    # Κατάσταση συναλλαγής
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )

    # Περίοδος δανεισμού (ισχύει μόνο για loan)
    start_date = models.DateField(null=True, blank=True, verbose_name="Έναρξη δανεισμού")
    end_date = models.DateField(null=True, blank=True, verbose_name="Λήξη δανεισμού")

    # Ημερομηνία δημιουργίας
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία δημιουργίας")

    # Ημερομηνία επιστροφής (μόνο όταν ο ιδιοκτήτης μαρκάρει “Επιστράφηκε”)
    returned_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία επιστροφής")

    # Όροι δανεισμού (ισχύουν μόνο για loan)
    terms = models.TextField(blank=True, null=True, verbose_name="Όροι Δανεισμού")
    borrower_accepted_terms = models.BooleanField(default=False, verbose_name="Αποδοχή Όρων από Αιτούντα")

    delivery_method = models.CharField(max_length=20, blank=True, null=True)
    meeting_lat = models.FloatField(blank=True, null=True)
    meeting_lng = models.FloatField(blank=True, null=True)
    meeting_status = models.CharField(
        max_length=20,
        choices=[
            ('none', 'Καμία'),
            ('proposed', 'Προτάθηκε'),
            ('accepted', 'Αποδεκτή'),
            ('rejected', 'Απορρίφθηκε')
        ],
        default='none'
    )

    def clean(self):
        """Έλεγχοι εγκυρότητας ανάλογα με το είδος συναλλαγής"""
        # ----- ΔΑΝΕΙΣΜΟΣ -----
        if self.transaction_type == 'loan':
            if not self.start_date or not self.end_date:
                raise ValidationError("Πρέπει να οριστούν ημερομηνίες για δανεισμό.")
            if self.start_date > self.end_date:
                raise ValidationError("Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη.")
            if self.status == 'accepted' and not self.borrower_accepted_terms:
                raise ValidationError("Ο αιτών πρέπει να αποδεχθεί τους όρους πριν εγκριθεί η συναλλαγή.")

        # ----- ΑΝΤΑΛΛΑΓΗ -----
        elif self.transaction_type == 'exchange':
            if self.start_date or self.end_date or self.terms:
                raise ValidationError("Δεν επιτρέπονται ημερομηνίες ή όροι για ανταλλαγή.")
            self.start_date = None
            self.end_date = None
            self.terms = None
            self.borrower_accepted_terms = False

    def __str__(self):
        return f"{self.requester} → {self.owner} ({self.get_transaction_type_display()})"

    class Meta:
        verbose_name = "Συναλλαγή"
        verbose_name_plural = "Συναλλαγές"
        ordering = ['-created_at']

    # ✅ Υπολογισμός απόστασης (με ασφάλεια)
    @property
    def distance_km(self):
        """Υπολογίζει την απόσταση (km) μεταξύ owner και requester, αν έχουν τοποθεσία."""
        user1 = self.owner
        user2 = self.requester

        if not (user1 and user2):
            return None

        try:
            lat1, lon1 = float(user1.latitude), float(user1.longitude)
            lat2, lon2 = float(user2.latitude), float(user2.longitude)
        except (TypeError, ValueError):
            return None

        R = 6371.0  # ακτίνα γης (km)
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return round(R * c, 2)


class Review(models.Model):
    """Αξιολόγηση χρήστη μετά από ολοκληρωμένη συναλλαγή."""
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Συναλλαγή"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_reviews",
        verbose_name="Αξιολογητής"
    )
    reviewed_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        verbose_name="Αξιολογούμενος"
    )

    rating = models.PositiveSmallIntegerField(default=5, verbose_name="Αστέρια (1-5)")
    comment = models.TextField(blank=True, null=True, verbose_name="Σχόλιο")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Δημιουργίας")

    class Meta:
        unique_together = ('transaction', 'reviewer')
        ordering = ['-created_at']
        verbose_name = "Αξιολόγηση"
        verbose_name_plural = "Αξιολογήσεις"

    def __str__(self):
        return f"{self.reviewer} → {self.reviewed_user} ({self.rating}⭐)"
