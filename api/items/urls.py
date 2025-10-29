from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ItemViewSet, UploadGalleryImageView

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')

urlpatterns = [
    path('', include(router.urls)),
    path('items/<int:pk>/upload_gallery_image/', UploadGalleryImageView.as_view(), name='upload_gallery_image'),
]
