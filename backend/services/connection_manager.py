import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Keeps WebSocket clients subscribed to collection-level events."""

    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket, collection_id: UUID | str) -> None:
        await websocket.accept()
        self._loop = asyncio.get_running_loop()
        self.active_connections[str(collection_id)].add(websocket)

    def disconnect(self, websocket: WebSocket, collection_id: UUID | str) -> None:
        subscribers = self.active_connections.get(str(collection_id))
        if not subscribers:
            return

        subscribers.discard(websocket)
        if not subscribers:
            self.active_connections.pop(str(collection_id), None)

    async def broadcast(self, collection_id: UUID | str, message: dict[str, Any]) -> None:
        subscribers = tuple(self.active_connections.get(str(collection_id), ()))
        disconnected: list[WebSocket] = []

        for websocket in subscribers:
            try:
                await websocket.send_json(message)
            except Exception:
                logger.debug("WebSocket disconnected while sending batch event", exc_info=True)
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket, collection_id)

    def broadcast_from_thread(self, collection_id: UUID | str, message: dict[str, Any]) -> None:
        """Schedule a broadcast from the synchronous BackgroundTasks worker."""
        if self._loop is None or self._loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            self.broadcast(collection_id, message),
            self._loop,
        )


connection_manager = ConnectionManager()