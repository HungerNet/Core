# Operations scripts

- `health-check.sh` checks the API liveness route at the local API address.
- `backup-postgres.sh` creates a mode-restricted custom-format dump using standard `PG*` environment variables. Store and encrypt off-host backups and test restores.
- `deploy-vps.sh` updates an already-provisioned host using SSH and a pre-published immutable `API_IMAGE`. Configure the host, reverse proxy, secrets, database migration procedure, and rollback before using it. These scripts do not configure infrastructure or run migrations.
