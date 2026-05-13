from django.db import models
from django.contrib.auth.models import User

class Recording(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recordings')
    title = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    duration = models.CharField(max_length=50)
    transcript = models.TextField()
    score = models.IntegerField()
    analysis_json = models.JSONField() # Ошибки будем хранить здесь
    audio_file = models.FileField(upload_to='recordings/')

    def __str__(self):
        return f"{self.title} - {self.user.username}"
