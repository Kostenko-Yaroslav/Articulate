from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RecordingViewSet, RegisterView

urlpatterns = [
    path('recordings/', RecordingViewSet.as_view({'get': 'list', 'post': 'create'}), name='recording-list'),
    path('recordings/<int:pk>/', RecordingViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='recording-detail'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
