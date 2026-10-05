# GitHub Actions

`ci.yml` is the initial pull request/push check scaffold. The Pages and VPS workflows are manual-dispatch templates and require protected GitHub Environments, production secrets, configured service projects, and a tested rollback/migration procedure before use. Do not grant production secrets to pull-request jobs. Add and commit package lockfiles before treating dependency installation as reproducible CI.
