"""Unit tests for conversation business rules; no MongoDB server required."""

from __future__ import annotations

import unittest
from copy import deepcopy

from copilot.exceptions import ConversationNotFoundError, InvalidConversationError
from copilot.models.conversation import Conversation, Message
from copilot.service.conversation_service import ConversationService


class InMemoryConversationRepository:
    """Small repository double that enforces the same user boundary as MongoDB."""

    def __init__(self) -> None:
        self.conversations: dict[str, Conversation] = {}
        self._next_id = 1

    async def create(self, conversation: Conversation) -> str:
        conversation_id = str(self._next_id)
        self._next_id += 1
        stored = deepcopy(conversation)
        stored.id = conversation_id
        self.conversations[conversation_id] = stored
        return conversation_id

    async def get_by_id(self, conversation_id: str, user_id: str | None = None):
        conversation = self.conversations.get(conversation_id)
        if conversation is None or (user_id is not None and conversation.user_id != user_id):
            return None
        return deepcopy(conversation)

    async def list_by_user(self, user_id: str, limit: int, skip: int):
        conversations = [
            deepcopy(item)
            for item in self.conversations.values()
            if item.user_id == user_id and item.status == "active"
        ]
        return conversations[skip : skip + limit]

    async def update_title(self, conversation_id: str, title: str, user_id: str | None = None) -> bool:
        conversation = await self.get_by_id(conversation_id, user_id)
        if conversation is None:
            return False
        self.conversations[conversation_id].title = title
        return True

    async def update_title_if_default(self, conversation_id: str, title: str, user_id: str | None = None) -> bool:
        conversation = await self.get_by_id(conversation_id, user_id)
        if conversation is None or conversation.title != "New Chat":
            return False
        self.conversations[conversation_id].title = title
        return True

    async def push_message(self, conversation_id: str, message: Message, user_id: str | None = None) -> bool:
        conversation = await self.get_by_id(conversation_id, user_id)
        if conversation is None:
            return False
        self.conversations[conversation_id].messages.append(deepcopy(message))
        return True

    async def update_summary(self, conversation_id: str, summary: str, user_id: str | None = None) -> bool:
        conversation = await self.get_by_id(conversation_id, user_id)
        if conversation is None:
            return False
        self.conversations[conversation_id].summary = summary
        return True

    async def delete(self, conversation_id: str, user_id: str | None = None) -> bool:
        conversation = await self.get_by_id(conversation_id, user_id)
        if conversation is None:
            return False
        del self.conversations[conversation_id]
        return True


class ConversationServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.repository = InMemoryConversationRepository()
        self.service = ConversationService(self.repository)  # type: ignore[arg-type]

    async def test_create_normalizes_custom_title(self) -> None:
        conversation = await self.service.create_conversation("user-1", "  Gaming phones  ")

        self.assertEqual(conversation.title, "Gaming phones")
        self.assertEqual(conversation.user_id, "user-1")

    async def test_blank_title_is_rejected(self) -> None:
        with self.assertRaises(InvalidConversationError):
            await self.service.create_conversation("user-1", "   ")

    async def test_messages_are_scoped_to_the_owner(self) -> None:
        conversation = await self.service.create_conversation("user-1")

        with self.assertRaises(ConversationNotFoundError):
            await self.service.save_message(conversation.id, "user", "Hello", user_id="user-2")

    async def test_first_user_message_auto_titles_once(self) -> None:
        conversation = await self.service.create_conversation("user-1")
        await self.service.save_message(conversation.id, "user", "Need a compact camera", user_id="user-1")
        await self.service.save_message(conversation.id, "user", "And good battery", user_id="user-1")

        persisted = await self.service.get_conversation(conversation.id, "user-1")
        self.assertEqual(persisted.title, "Need a compact camera")
        self.assertEqual(len(persisted.messages), 2)

    async def test_identical_summary_update_remains_successful(self) -> None:
        conversation = await self.service.create_conversation("user-1")
        await self.service.update_summary(conversation.id, "Looking for headphones", "user-1")
        updated = await self.service.update_summary(conversation.id, "Looking for headphones", "user-1")

        self.assertEqual(updated.summary, "Looking for headphones")


if __name__ == "__main__":
    unittest.main()
