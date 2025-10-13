from django_filters import rest_framework as filters
from .models import Item

class ItemFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr="icontains")
    description = filters.CharFilter(field_name="description", lookup_expr="icontains")
    transaction_type = filters.ChoiceFilter(choices=Item.TRANSACTION_CHOICES)
    available = filters.BooleanFilter(field_name="available")
    owner = filters.CharFilter(field_name="owner__username", lookup_expr="iexact")
    created_after = filters.DateFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateFilter(field_name="created_at", lookup_expr="lte")

    # ✅ νέα "ψεύτικα" πεδία για να μην κόβει ο DjangoFilter τα params
    lat = filters.NumberFilter(method="noop_filter")
    lon = filters.NumberFilter(method="noop_filter")
    max_distance = filters.NumberFilter(method="noop_filter")

    def noop_filter(self, queryset, name, value):
        return queryset  # Δεν αλλάζει το queryset, απλώς επιτρέπει να περάσουν τα params

    class Meta:
        model = Item
        fields = [
            "title",
            "description",
            "transaction_type",
            "available",
            "owner",
            "created_after",
            "created_before",
        ]
