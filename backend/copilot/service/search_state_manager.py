"""Deterministic state transitions for conversational product filtering."""

from datetime import datetime, timezone

from copilot.models.search_state import SearchState, SearchStateCommand, SearchStateTransition


class SearchStateManager:
    """Applies validated filter commands without inspecting chat history."""

    def apply(
        self,
        current: SearchState | None,
        command: SearchStateCommand,
    ) -> SearchStateTransition:
        current = current or SearchState()
        values = command.filters.model_dump(exclude_unset=True) if command.filters else {}

        if command.operation == "merge":
            state = current.model_copy(update=values)
        elif command.operation == "replace":
            state = SearchState(**values)
        elif command.operation == "remove":
            state = current.model_copy(update={name: None for name in command.remove})
        else:  # reset payload validation occurs in SearchStateCommand
            state = SearchState()

        # model_copy does not re-run Pydantic validators, so re-validate every
        # transition before it can be persisted or passed to product search.
        state = SearchState.model_validate(state.model_dump())
        state.updated_at = datetime.now(timezone.utc)
        return SearchStateTransition(
            state=state,
            archive_previous=command.operation in {"replace", "reset"} and current.has_filters(),
        )
