import uuid
from django.db import models

class Application(models.Model):
    reference = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission_key = models.UUIDField(unique=True)
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=16)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    qualification = models.CharField(max_length=120)
    passing_year = models.PositiveSmallIntegerField()
    position = models.CharField(max_length=100, default="Customer Service Associate (Demo)")
    demo_acknowledged = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.full_name} · {self.reference}"
