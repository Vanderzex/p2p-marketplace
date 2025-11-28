from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Avg, Q

class User(AbstractUser):
    """
    Επεκτεταμένο User model με πρόσθετα στατιστικά και προφίλ
    για το P2P Marketplace.
    """

    # Μέση αξιολόγηση (υπολογίζεται από τα Review)
    average_rating = models.FloatField(default=0, verbose_name="Μέση Αξιολόγηση")

    # Συνολικές ολοκληρωμένες συναλλαγές (ως owner ή requester)
    total_completed_transactions = models.PositiveIntegerField(
        default=0, verbose_name="Ολοκληρωμένες Συναλλαγές"
    )

    bio = models.TextField(blank=True, null=True, verbose_name="Περιγραφή χρήστη")

    profile_image = models.ImageField(
        upload_to="profile_images/",
        blank=True,
        null=True,
        verbose_name="Φωτογραφία προφίλ"
    )

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_name = models.CharField(max_length=255, blank=True, null=True)  # optional readable address


    def update_average_rating(self):
        """
        Υπολογίζει και ενημερώνει τον μέσο όρο αξιολογήσεων
        κάθε φορά που δημιουργείται ή αλλάζει ένα Review.
        """
        from transactions.models import Review  # αποφυγή κυκλικής εισαγωγής

        avg = Review.objects.filter(reviewed_user=self).aggregate(Avg('rating'))['rating__avg']
        self.average_rating = round(avg or 0, 2)
        self.save(update_fields=['average_rating'])

    def update_total_completed_transactions(self):
        """
        Υπολογίζει και ενημερώνει το πλήθος των ολοκληρωμένων συναλλαγών
        στις οποίες συμμετείχε ο χρήστης (είτε ως requester είτε ως owner).
        """
        from transactions.models import Transaction  # αποφυγή κυκλικής εισαγωγής

        total = Transaction.objects.filter(
            Q(requester=self) | Q(owner=self),
            status='completed'
        ).count()
        self.total_completed_transactions = total
        self.save(update_fields=['total_completed_transactions'])

    def __str__(self):
        return self.username
