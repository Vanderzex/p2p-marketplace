from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet
from .views import ReviewViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = router.urls
