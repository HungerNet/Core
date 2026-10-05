from __future__ import annotations

from urllib.parse import urlencode


class OAuthService:
    @staticmethod
    def build_authorization_url(provider: str, client_id: str, redirect_uri: str, *, scope: str, state: str) -> str:
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scope,
            "state": state,
        }
        return f"https://{provider}.example.com/oauth/authorize?{urlencode(params)}"

    @staticmethod
    def validate_callback(provider: str, code: str, state: str) -> bool:
        return bool(provider and code and state)
