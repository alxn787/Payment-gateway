# Crypto Payment Gateway

## Architecture
![alt text](arch.png)

This architecture is designed for secure, efficient, and scalable digital asset transactions, ready to power e-commerce, dApps, and beyond.

Key features include:

Key splitting across DB and Redis for enhanced security and resilience.

Helius indexer with webhooks for automated address sweeping from split keypairs.

Secure cold wallet integration for large fund protection.

Shamir's secret for for highly secure transaction signing.
