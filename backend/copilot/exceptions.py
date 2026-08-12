"""
Custom exceptions for the Copilot module.

=== WHY CUSTOM EXCEPTIONS? ===
1. Separation of concerns — services raise domain exceptions, the router
   layer maps them to HTTP status codes. Services never import FastAPI.
2. Consistent error responses — every 404 has the same shape, every 400
   has the same shape. No ad-hoc HTTPException scattered through business logic.
3. Testability — unit tests can assert on exception types without importing
   FastAPI or knowing about HTTP status codes.
4. Single Responsibility — the service says WHAT went wrong; the router
   decides HOW to report it to the client.
"""


class ConversationNotFoundError(Exception):
    """
    Raised when a conversation ID does not match any document in the database.

    Mapped to HTTP 404 in the router layer.
    """

    def __init__(self, conversation_id: str) -> None:
        self.conversation_id = conversation_id
        super().__init__(f"Conversation not found: {conversation_id}")


class InvalidConversationError(Exception):
    """
    Raised when a conversation operation receives invalid input
    (e.g., empty title, message content too long).

    Mapped to HTTP 422 in the router layer.
    """

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)
