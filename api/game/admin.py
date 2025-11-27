from django.contrib import admin
from .models import World, Chunk, Player

@admin.register(World)
class WorldAdmin(admin.ModelAdmin):
    list_display = ('name', 'seed', 'created_at')

@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ('world', 'x', 'z')
    list_filter = ('world',)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('username', 'x', 'y', 'z', 'last_seen')

