import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import World, Chunk, Player

CHUNK_SIZE = 16

class GameConsumer(AsyncWebsocketConsumer):
    players = {}

    async def connect(self):
        self.room_name = "world"
        self.room_group_name = "game_world"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Save player state and remove from list
        if self.channel_name in self.players:
            player_data = self.players[self.channel_name]
            await self.save_player_state(player_data)
            
            del self.players[self.channel_name]
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "player_left",
                    "id": self.channel_name
                }
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type")

        if message_type == "join":
            username = data.get("username", "Anonymous")
            
            # Get or create player from DB
            player_obj = await self.get_or_create_player(username)
            
            self.players[self.channel_name] = {
                "id": self.channel_name,
                "username": username,
                "position": {"x": player_obj.x, "y": player_obj.y, "z": player_obj.z},
                "rotation": {"x": player_obj.rotation_x, "y": player_obj.rotation_y, "z": 0}
            }

            # Send player init data (ID and saved position)
            await self.send(text_data=json.dumps({
                "type": "player_init",
                "id": self.channel_name,
                "position": self.players[self.channel_name]["position"],
                "rotation": self.players[self.channel_name]["rotation"]
            }))
            
            # Get world data
            world_data = await self.get_world_data()
            
            # Send world data (Seed & Modifications & Time)
            await self.send(text_data=json.dumps({
                "type": "world_data",
                "seed": world_data['seed'],
                "time": world_data['time'],
                "modifications": world_data['modifications']
            }))
            
            # Send current players list to the new player
            await self.send(text_data=json.dumps({
                "type": "players_list",
                "players": list(self.players.values())
            }))
            
            # Notify others
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "player_joined",
                    "player": self.players[self.channel_name]
                }
            )

        elif message_type == "update":
            if self.channel_name in self.players:
                self.players[self.channel_name]["position"] = data.get("position")
                self.players[self.channel_name]["rotation"] = data.get("rotation")
                
                # Broadcast update to others
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "player_update",
                        "id": self.channel_name,
                        "position": data.get("position"),
                        "rotation": data.get("rotation")
                    }
                )
        
        elif message_type == "block_update":
            position = data.get("position")
            block_type = data.get("blockType")
            
            # Save modification to DB
            await self.save_block_update(position, block_type)
            
            # Broadcast to all
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "block_update",
                    "position": position,
                    "blockType": block_type
                }
            )

    # Database methods
    @database_sync_to_async
    def get_or_create_player(self, username):
        player, created = Player.objects.get_or_create(username=username)
        return player

    @database_sync_to_async
    def save_player_state(self, player_data):
        try:
            player = Player.objects.get(username=player_data['username'])
            player.x = player_data['position']['x']
            player.y = player_data['position']['y']
            player.z = player_data['position']['z']
            player.rotation_x = player_data['rotation']['x']
            player.rotation_y = player_data['rotation']['y']
            player.save()
        except Player.DoesNotExist:
            pass

    @database_sync_to_async
    def get_world_data(self):
        world, created = World.objects.get_or_create(name="World 1")
        
        # Aggregate all modifications from chunks
        all_modifications = {}
        for chunk in world.chunks.all():
            all_modifications.update(chunk.modifications)
            
        return {
            "seed": world.seed,
            "time": world.time,
            "modifications": all_modifications
        }

    @database_sync_to_async
    def save_block_update(self, position, block_type):
        world, created = World.objects.get_or_create(name="World 1")
        
        # Calculate chunk coordinates
        chunk_x = int(position['x']) // CHUNK_SIZE
        chunk_z = int(position['z']) // CHUNK_SIZE
        
        chunk, created = Chunk.objects.get_or_create(
            world=world,
            x=chunk_x,
            z=chunk_z
        )
        
        key = f"{position['x']},{position['y']},{position['z']}"
        chunk.modifications[key] = block_type
        chunk.save()

    # Handlers for group messages
    async def player_joined(self, event):

        await self.send(text_data=json.dumps({
            "type": "player_joined",
            "player": event["player"]
        }))

    async def player_left(self, event):
        await self.send(text_data=json.dumps({
            "type": "player_left",
            "id": event["id"]
        }))

    async def player_update(self, event):
        # Don't send update back to sender
        if event["id"] != self.channel_name:
            await self.send(text_data=json.dumps({
                "type": "player_update",
                "id": event["id"],
                "position": event["position"],
                "rotation": event["rotation"]
            }))

    async def block_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "block_update",
            "position": event["position"],
            "blockType": event["blockType"]
        }))
