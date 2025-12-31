# Eligibility Engine

A small TypeScript service that determines whether an action is allowed right now, based on historical records, time windows, and policy rules stored in a database.

## Quick Start

```bash
# Setup the project
make setup

# Start the development server
make dev
```

The API will be running at http://localhost:3030

## API Examples

### Health Check
```bash
curl http://localhost:3030/health
```

### Check Eligibility
```bash
curl -X POST http://localhost:3030/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "action": "api_call", "amount": 1}'
```

### Record an Action
```bash
curl -X POST http://localhost:3030/eligibility/record \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "action": "api_call", "amount": 1}'
```

### Get User Action History
```bash
curl http://localhost:3030/eligibility/history/user123
```

### List Policies
```bash
curl http://localhost:3030/policies
```

### Create a Policy
```bash
curl -X POST http://localhost:3030/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily API Limit",
    "action": "api_call",
    "limit": 1000,
    "window": "daily"
  }'
```

## Development

```bash
# Start database containers
make docker-up

# Run migrations
make db-migrate

# Start development server
make dev

# Run tests
make test

# Run e2e tests
make test-e2e
```
