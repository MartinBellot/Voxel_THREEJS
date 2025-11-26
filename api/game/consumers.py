import json
import random
from channels.generic.websocket import AsyncWebsocketConsumer

# Simple in-memory storage for world state (Global variable)
# In a real production app, this should be in a database or Redis
class WorldState:
    def __init__(self):
        self.seed = random.randint(0, 100000)
        self.modifications = {} # Key: "x,y,z", Value: blockType

world_state = WorldState()

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
        
        # Remove player from list and notify others
        if self.channel_name in self.players:
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
            self.players[self.channel_name] = {
                "id": self.channel_name,
                "username": username,
                "position": {"x": 0, "y": 0, "z": 0},
                "rotation": {"x": 0, "y": 0, "z": 0}
            }
            
            # Send world data (Seed & Modifications)
            await self.send(text_data=json.dumps({
                "type": "world_data",
                "seed": world_state.seed,
                "modifications": world_state.modifications
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
            # Save modification
            position = data.get("position")
            block_type = data.get("blockType")
            key = f"{position['x']},{position['y']},{position['z']}"
            
            if block_type == 0: # Air / Removed
                # We still need to store it as "air" to override generated terrain
                world_state.modifications[key] = 0
            else:
                world_state.modifications[key] = block_type
            
            # Broadcast to all
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "block_update",
                    "position": position,
                    "blockType": block_type
                }
            )

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
