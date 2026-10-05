# Phase 9 Test Matrix

## Authentication and sessions

- OAuth2 start flow for Google, GitHub, Discord
- state/nonce/PKCE validation and replay protection
- session creation after callback
- logout and refresh edge cases
- expired cookie/session rejection

## Authorization

- direct user access to protected endpoints
- role grant and revocation
- permission propagation for admin and profile paths
- disabled user checks

## Profiles

- current-user profile read and patch
- public profile visibility
- identity linking and unlinking
- last-identity protection checks

## Content

- project posting and retrieval
- moderation or admin status workflows
- site-specific content fetches to Modrinth

## Network and proxy

- reverse-proxy request routing
- CORS origin allowlist enforcement
- secure cookie attributes
- redirect allowlist validation

## Pass criteria

Each scenario should assert a stable success or rejection condition and capture the response status, cookie behavior, and request ID.
