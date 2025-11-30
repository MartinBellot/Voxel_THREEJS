import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Operator
from game.models import World, Player

class ConsoleConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = "console"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        command_text = data.get("command")
        username = data.get("username")

        if not command_text:
            return

        # Broadcast the command to everyone (like a chat)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "console_log",
                "message": f"> {username}: {command_text}",
                "level": "info"
            }
        )

        # Process command
        if command_text.startswith('/'):
            args = command_text.strip().split(' ')
            cmd = args.pop(0).lower()[1:]  # Remove the leading '/'

            if cmd == "time":
                await self.handle_time(args, username)
            elif cmd == "tp" or cmd == "teleport":
                await self.handle_tp(args, username)
            elif cmd == "fly":
                await self.handle_fly(args, username)
            elif cmd == "gamemode":
                await self.handle_gamemode(args, username)
            elif cmd == "help":
                await self.handle_help()
            else:
                await self.send_log(f"Unknown command: {cmd}", "error")

    async def handle_gamemode(self, args, username):
        if not await self.is_operator(username):
             await self.send_log("Vous n'êtes pas opérateur", "error")
             return

        if len(args) < 1:
            await self.send_log("Usage: /gamemode <survival/creative> [player]", "error")
            return

        mode = args[0].lower()
        if mode not in ["survival", "creative"]:
            await self.send_log("Invalid gamemode. Use 'survival' or 'creative'", "error")
            return

        target_username = username
        if len(args) > 1:
            target_username = args[1]

        # Update DB and notify
        success = await self.update_player_gamemode(target_username, mode)
        if success:
            await self.broadcast_log(f"Set gamemode to {mode} for {target_username}")
            
            # Notify GameConsumer group
            await self.channel_layer.group_send(
                "game_world",
                {
                    "type": "gamemode_update",
                    "username": target_username,
                    "gamemode": mode
                }
            )
        else:
            await self.send_log(f"Player {target_username} not found", "error")

    @database_sync_to_async
    def update_player_gamemode(self, username, mode):
        try:
            player = Player.objects.get(username=username)
            player.gamemode = mode
            player.save()
            return True
        except Player.DoesNotExist:
            return False

    async def handle_time(self, args, username):
        if not await self.is_operator(username):
            await self.send_log("Vous n'êtes pas opérateur", "error")
            return

        if len(args) < 2 or args[0] != "set":
            await self.send_log("Usage: /time set <day/night/value>", "error")
            return

        value = args[1].lower()
        time_val = 0
        if value == "day":
            time_val = 6000
        elif value == "night":
            time_val = 18000
        else:
            try:
                time_val = int(value)
            except ValueError:
                await self.send_log("Invalid time value", "error")
                return

        await self.update_world_time(time_val)
        
        # Broadcast time update to console group (clients will update game time)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "time_update",
                "time": time_val
            }
        )
        
        await self.broadcast_log(f"Time set to {time_val}")

    async def handle_tp(self, args, username):
        if not await self.is_operator(username):
             await self.send_log("Vous n'êtes pas opérateur", "error")
             return

        if len(args) < 3:
            await self.send_log("Usage: /tp <x> <y> <z>", "error")
            return
            
        try:
            x, y, z = float(args[0]), float(args[1]), float(args[2])
            # Send teleport command ONLY to the sender
            await self.send(text_data=json.dumps({
                "type": "teleport",
                "x": x, "y": y, "z": z
            }))
            await self.broadcast_log(f"{username} teleported to {x}, {y}, {z}")
        except ValueError:
            await self.send_log("Invalid coordinates", "error")

    async def handle_fly(self, args, username):
        if not await self.is_operator(username):
             await self.send_log("Vous n'êtes pas opérateur", "error")
             return
             
        # Toggle fly mode for sender
        state = None
        if len(args) > 0:
            state = args[0].lower()
        
        await self.send(text_data=json.dumps({
            "type": "fly_mode",
            "state": state
        }))
        await self.broadcast_log(f"{username} toggled fly mode")

    async def handle_help(self):
        await self.send_log("Available commands: /tp, /fly, /time set")

    @database_sync_to_async
    def is_operator(self, username):
        return Operator.objects.filter(username=username).exists()

    @database_sync_to_async
    def update_world_time(self, time):
        world = World.objects.first()
        if world:
            world.time = time
            world.save()

    async def send_log(self, message, level="info"):
        await self.send(text_data=json.dumps({
            "type": "console_log",
            "message": message,
            "level": level
        }))

    async def broadcast_log(self, message, level="info"):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "console_log",
                "message": message,
                "level": level
            }
        )

    async def console_log(self, event):
        await self.send(text_data=json.dumps(event))

    async def time_update(self, event):
        await self.send(text_data=json.dumps(event))
