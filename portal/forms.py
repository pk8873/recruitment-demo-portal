from django import forms
from django.utils import timezone
from .models import Application

class ApplicationForm(forms.ModelForm):
    website = forms.CharField(required=False, widget=forms.TextInput(attrs={"autocomplete": "off", "tabindex": "-1"}))
    demo_acknowledged = forms.BooleanField(
        required=True,
        label="I understand this is a fictional demonstration. I am using invented test details.",
    )

    class Meta:
        model = Application
        fields = [
            "full_name", "email", "phone", "city", "state",
            "qualification", "passing_year", "demo_acknowledged",
        ]
        widgets = {
            "full_name": forms.TextInput(attrs={"placeholder": "e.g. Rahul Kumar", "autocomplete": "name"}),
            "email": forms.EmailInput(attrs={"placeholder": "name@example.test", "autocomplete": "email"}),
            "phone": forms.TextInput(attrs={"placeholder": "10-digit demo number", "inputmode": "numeric", "autocomplete": "off"}),
            "city": forms.TextInput(attrs={"placeholder": "Your city"}),
            "state": forms.TextInput(attrs={"placeholder": "Your state"}),
            "qualification": forms.Select(choices=[
                ("", "Select qualification"),
                ("12th Pass (Demo)", "12th Pass"),
                ("Diploma (Demo)", "Diploma"),
                ("Graduate (Demo)", "Graduate"),
                ("Postgraduate (Demo)", "Postgraduate"),
                ("Other (Demo)", "Other"),
            ]),
            "passing_year": forms.NumberInput(attrs={"min": "1980", "max": str(timezone.localdate().year), "placeholder": "e.g. 2024"}),
        }

    def clean_website(self):
        value = self.cleaned_data.get("website", "")
        if value:
            raise forms.ValidationError("Invalid submission.")
        return value

    def clean_phone(self):
        value = self.cleaned_data["phone"].strip()
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 10:
            raise forms.ValidationError("Enter a 10-digit test phone number.")
        return digits

    def clean_passing_year(self):
        year = self.cleaned_data["passing_year"]
        if year < 1980 or year > timezone.localdate().year:
            raise forms.ValidationError("Enter a valid passing year.")
        return year

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.position = "Customer Service Associate (Demo)"
        if commit:
            obj.save()
        return obj
