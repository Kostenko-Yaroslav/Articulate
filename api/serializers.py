from rest_framework import serializers, viewsets, permissions
from .models import Recording
from django.contrib.auth.models import User

class RecordingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recording
        fields = '__all__'
        read_only_fields = ('user',)

class RecordingViewSet(viewsets.ModelViewSet):
    serializer_class = RecordingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Recording.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
