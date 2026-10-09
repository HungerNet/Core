# HungerNet Account and Sign-In

## Sign-in entry

Public apps show one floating **Continue with HungerNet** control below the navbar. It starts a login-first flow. The app creates a random PKCE verifier, derives an S256 challenge, and stores the verifier plus a random state in that app's `sessionStorage`. It then sends the browser to the Account app's `/authorize` page with the app ID, callback URL, state, and challenge.

The Account host is selected from the current site: normal domains use `account.hungernet.dev`; `*.millered001.workers.dev` uses `account.millered001.workers.dev`. The callback returns to the same app domain that started sign-in.

## Existing and new accounts

The Account page validates the requesting app, callback URL, state, and PKCE challenge before showing the local sign-in form. A successful sign-in returns to the authorization review page, where the user can approve access to their public profile.

When the login API returns an unauthorized response, the form switches to account creation and carries over the entered email or username. This response is intentionally generic: it can mean the account is unknown, the password is wrong, or the account has not completed MFA setup. Registration remains server-validated; if the identifier already belongs to an account, the API rejects the duplicate rather than creating another account. The user can return to sign-in if they already have an account.

New accounts are required to enroll an authenticator app. Registration creates a pending account and TOTP secret; sign-in completes only after the six-digit authenticator code is verified. The server does not issue an authenticated session before that verification.

## Authorization and tokens

After sign-in, the user reviews the app's requested profile scope and explicitly approves or cancels. Approval creates a one-time authorization code. The requesting app exchanges that code using its original PKCE verifier. The callback verifies state and stores the resulting short-lived profile token in that app's `sessionStorage`, scoped by app ID. The verifier and pending state are removed after successful exchange.

The app uses its API session cookie when available. Otherwise, it sends the app-scoped bearer token to the API's user-info endpoint. Sign-out clears the local token and asks the API to revoke/clear the session.

## Normal domains and Workers.dev

Normal sites use `https://api.hungernet.dev/api/v1`. The shared `.hungernet.dev` session cookie can be scoped to the normal HungerNet domain; third-party app domains rely on the app-scoped PKCE token when the cookie is unavailable.

Workers.dev apps use `https://api.hacklets.dev/api/v1`, except the Account app. The Account Worker proxies `/api/v1` requests to the API from the same origin so browsers can use its host-only session and CSRF cookies without third-party-cookie access. Wrangler must route `/api/v1` through the Worker before serving SPA assets. The API must allow Workers.dev origins through CORS and must not set the `.hungernet.dev` cookie domain for a Workers.dev request. OAuth state cookies remain short-lived and `SameSite=Lax` because they are used on the API's provider callback.

The browser makes API requests to the API host selected above (or the Account same-origin proxy) and authorization navigations to the matching Account host; it does not need a connection to `*.hungernet.dev` while using a Workers.dev app. This requires a deployed API version that includes the Workers.dev CORS/cookie handling and current auth routes.

## Security properties

- PKCE uses a fresh verifier and SHA-256 challenge for each authorization attempt.
- State binds the callback to the initiating browser session and is compared before code exchange.
- Callback URLs are restricted to registered apps or approved Workers.dev callback origins.
- Authorization codes are one-time; profile tokens are app-scoped and stored in tab/session storage, not persistent local storage.
- Passwords are sent only to the API over HTTPS. A password or authenticator code is never shared with a requesting app.
- Registration requires MFA enrollment and verification before session creation.
- Browser API requests include credentials; state-changing requests use the CSRF token. Workers.dev cookies are host-only, Secure, and SameSite=None for cross-site use.
- CORS and OAuth return-origin allowlists are enforced by the API. They must be configured and deployed on the server as well as represented in frontend code.