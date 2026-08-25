# Graph Report - ticketing-concurrency-engine  (2026-08-25)

## Corpus Check
- 255 files · ~129,320 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 194 nodes · 252 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Development Dependencies
- Runtime Dependencies
- Authentication and Event Services
- Package Configuration
- Order Checkout and Locks
- TSConfig Configuration
- Queue Workers and Webhooks
- API Routing and Validation
- Event Repository and REST Core
- Prisma TSConfig
- Load Testing Scripts
- Database Seed
- File Upload Middleware
- Webhook Test Utils

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `AppError` - 9 edges
3. `scripts` - 7 edges
4. `UserRepository` - 7 edges
5. `AuthService` - 7 edges
6. `EventService` - 7 edges
7. `prisma` - 6 edges
8. `EventRepository` - 6 edges
9. `LockManager` - 5 edges
10. `compilerOptions` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "Development Dependencies"
Cohesion: 0.07
Nodes (27): autocannon, devDependencies, autocannon, prisma, rimraf, ts-node-dev, tsx, @types/autocannon (+19 more)

### Community 1 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (25): @aws-sdk/client-s3, bcryptjs, bullmq, cors, dotenv, express, helmet, ioredis (+17 more)

### Community 2 - "Authentication and Event Services"
Cohesion: 0.14
Nodes (7): s3Client, AuthController, UserRepository, AuthService, AppError, asyncHandler(), AsyncRequestHandler

### Community 3 - "Package Configuration"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, main, name, prisma, seed (+8 more)

### Community 4 - "Order Checkout and Locks"
Cohesion: 0.18
Nodes (7): redis, CheckoutController, AuthenticatedRequest, authenticateToken(), router, CheckoutService, LockManager

### Community 5 - "TSConfig Configuration"
Cohesion: 0.12
Nodes (15): ES2022, src/**/*, compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+7 more)

### Community 6 - "Queue Workers and Webhooks"
Cohesion: 0.19
Nodes (8): prisma, orderExpirationQueue, queueConnection, WebhookController, router, CheckoutResponse, CancelOrderJobData, orderExpirationWorker

### Community 7 - "API Routing and Validation"
Cohesion: 0.20
Nodes (9): app, errorHandler(), validate(), authController, authService, router, userRepo, loginSchema (+1 more)

### Community 8 - "Event Repository and REST Core"
Cohesion: 0.22
Nodes (3): EventController, EventRepository, EventService

### Community 9 - "Prisma TSConfig"
Cohesion: 0.22
Nodes (8): compilerOptions, rootDir, types, extends, include, node, seed.ts, ../tsconfig.json

### Community 10 - "Load Testing Scripts"
Cohesion: 0.50
Nodes (4): getJwtToken(), runLoadTest(), seedData, seedDataPath

## Knowledge Gaps
- **69 isolated node(s):** `seedDataPath`, `seedData`, `name`, `version`, `main` (+64 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Development Dependencies` to `Package Configuration`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Configuration`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `AppError` connect `Authentication and Event Services` to `Event Repository and REST Core`, `Order Checkout and Locks`, `API Routing and Validation`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `seedDataPath`, `seedData`, `name` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Development Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Authentication and Event Services` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._