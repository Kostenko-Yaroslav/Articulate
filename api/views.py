from rest_framework import viewsets, permissions, generics
from .models import Recording
from .serializers import RecordingSerializer, UserSerializer
from django.contrib.auth.models import User

class RecordingViewSet(viewsets.ModelViewSet):
    serializer_class = RecordingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Recording.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer
