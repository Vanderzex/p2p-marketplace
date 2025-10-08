from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Επιτρέπει αλλαγές μόνο στον ιδιοκτήτη του αντικειμένου.
    Οι υπόλοιποι έχουν μόνο read-only πρόσβαση.
    """

    def has_object_permission(self, request, view, obj):
        # Όλοι μπορούν να κάνουν GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True
        # Μόνο ο ιδιοκτήτης μπορεί να αλλάξει ή να διαγράψει
        return obj.owner == request.user
