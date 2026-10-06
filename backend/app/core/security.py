from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import struct
import time
from datetime import UTC, datetime, timedelta

from app.core.config import settings


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("ascii"))


def generate_session_token(
    subject: str,
    session_id: str,
    *,
    scope: str = "session",
    audience: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "sid": session_id,
        "scope": scope,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes or settings.jwt_expiry_minutes)).timestamp()),
    }
    if audience:
        payload["aud"] = audience

    header = {"alg": settings.jwt_algorithm, "typ": "JWT"}
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(settings.jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_b64url_encode(signature)}"


def verify_session_token(token: str) -> dict | None:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(header, dict) or header.get("alg") != settings.jwt_algorithm:
        return None

    expected = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    try:
        actual = _b64url_decode(signature_b64)
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None

    if not hmac.compare_digest(expected, actual) or not isinstance(payload, dict):
        return None
    now = int(datetime.now(UTC).timestamp())
    if not isinstance(payload.get("exp"), int) or payload["exp"] <= now:
        return None
    if not isinstance(payload.get("iat"), int) or payload["iat"] > now + 60:
        return None
    if not isinstance(payload.get("sub"), str) or not isinstance(payload.get("sid"), str):
        return None

    return payload


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return f"pbkdf2_sha256$600000${_b64url_encode(salt)}${_b64url_encode(digest)}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, iterations, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256" or int(iterations) != 600_000:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), _b64url_decode(salt), int(iterations)
        )
        return hmac.compare_digest(digest, _b64url_decode(expected))
    except (ValueError, TypeError):
        return False


def new_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def verify_totp(secret: str, code: str, *, at_time: int | None = None) -> bool:
    if len(code) != 6 or not code.isdigit():
        return False
    try:
        key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    except (ValueError, TypeError):
        return False
    counter = int((time.time() if at_time is None else at_time) // 30)
    for offset in (-1, 0, 1):
        digest = hmac.new(key, struct.pack(">Q", counter + offset), hashlib.sha1).digest()
        position = digest[-1] & 0x0F
        value = struct.unpack(">I", digest[position : position + 4])[0] & 0x7FFFFFFF
        if hmac.compare_digest(f"{value % 1_000_000:06d}", code):
            return True
    return False


def create_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    challenge = _b64url_encode(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge
