"""Lightweight smoke-check scaffolding for the Phase 9 validation pass.

The project-specific behaviors are intentionally represented as explicit cases so they
can be expanded into robust pytest coverage once the backend and app flows are fully wired.
"""

from __future__ import annotations

from typing import Any, Dict, List

SCENARIOS: List[Dict[str, Any]] = [
    {
        "name": "oauth-google-start",
        "kind": "oauth",
        "path": "/api/v1/auth/google/start",
        "expected": "302 redirect with valid state",
    },
    {
        "name": "oauth-github-callback",
        "kind": "oauth",
        "path": "/api/v1/auth/github/callback",
        "expected": "validated state and session creation",
    },
    {
        "name": "session-bootstraps-user",
        "kind": "session",
        "path": "/api/v1/auth/session",
        "expected": "authenticated or unauthenticated payload with stable status",
    },
    {
        "name": "permissions-admin-route",
        "kind": "permission",
        "path": "/api/v1/admin/users",
        "expected": "403 for non-admin callers",
    },
    {
        "name": "profile-update",
        "kind": "profile",
        "path": "/api/v1/users/me",
        "expected": "allowlisted field update and audit trail",
    },
    {
        "name": "public-profile-read",
        "kind": "profile",
        "path": "/api/v1/users/{user_id}",
        "expected": "public profile only when visibility allows",
    },
    {
        "name": "projects-post-and-read",
        "kind": "content",
        "path": "/api/v1/projects",
        "expected": "create and fetch project metadata",
    },
    {
        "name": "modrinth-version-resolve",
        "kind": "integration",
        "path": "https://api.modrinth.com/v2/project/optifine-for-fabric",
        "expected": "successful lookup and normalized version metadata",
    },
]


def main() -> None:
    for scenario in SCENARIOS:
        print(f"{scenario['name']}: {scenario['expected']}")


if __name__ == "__main__":
    main()
