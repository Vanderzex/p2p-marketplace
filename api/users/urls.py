from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, UserViewSet, UploadProfileImageView, ChangePasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('upload-profile-image/', UploadProfileImageView.as_view(), name='upload-profile-image'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Προφίλ χρηστών (λίστα + συγκεκριμένο ID)
    path('', include(router.urls)),
]
