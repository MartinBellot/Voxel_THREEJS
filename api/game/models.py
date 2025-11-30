from django.db import models

class World(models.Model):
    name = models.CharField(max_length=100, default="World 1")
    seed = models.IntegerField(default=12345)
    time = models.IntegerField(default=6000)
    motd = models.CharField(max_length=255, default="Welcome to the Voxel World!")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Chunk(models.Model):
    world = models.ForeignKey(World, on_delete=models.CASCADE, related_name='chunks')
    x = models.IntegerField()
    z = models.IntegerField()
    # Store modifications as JSON: {"x,y,z": block_id}
    modifications = models.JSONField(default=dict) 

    class Meta:
        unique_together = ('world', 'x', 'z')

    def __str__(self):
        return f"Chunk {self.x},{self.z}"

class Player(models.Model):
    username = models.CharField(max_length=100, unique=True)
    x = models.FloatField(default=0)
    y = models.FloatField(default=80)
    z = models.FloatField(default=0)
    rotation_x = models.FloatField(default=0)
    rotation_y = models.FloatField(default=0)
    inventory = models.JSONField(default=list)
    gamemode = models.CharField(max_length=20, default="survival")
    health = models.IntegerField(default=20)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username

