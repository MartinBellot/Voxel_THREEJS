from django.contrib import admin
from .models import Operator

@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display = ('username', 'added_at')
    search_fields = ('username',)

