# Security and integrity

- There is no server, account or personal data; the attack surface is the repository and the maintainer's accounts (MFA on).
- **Integrity reports matter most here:** a frozen file that does not match its hash, a score that does not reproduce, a paper of doubtful origin, or question text that slipped into the public data. Open an issue, or email the maintainer for anything sensitive.
- Never commit API keys, PDFs or transcriptions. `local/` and `.env` are git-ignored.
