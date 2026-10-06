import pytest
from pydantic import ValidationError

from app.schemas.user import UserUpdateRequest


def test_username_is_trimmed_and_normalized() -> None:
    payload = UserUpdateRequest(username="  Example_User  ")

    assert payload.username == "example_user"


def test_username_rejects_invalid_normalized_value() -> None:
    with pytest.raises(ValidationError):
        UserUpdateRequest(username="  x  ")


def test_email_is_trimmed_and_normalized() -> None:
    payload = UserUpdateRequest(email="  Member@Example.Test  ")

    assert payload.email == "member@example.test"


def test_email_rejects_invalid_value() -> None:
    with pytest.raises(ValidationError):
        UserUpdateRequest(email="not-an-email")


@pytest.mark.parametrize("field", ["display_name", "username", "profile_visibility"])
def test_non_nullable_profile_fields_reject_null(field: str) -> None:
    with pytest.raises(ValidationError):
        UserUpdateRequest.model_validate({field: None})