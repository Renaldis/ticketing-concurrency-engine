# Stage 1: Build & Compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code & configuration
COPY tsconfig.json ./
COPY src ./src/
COPY swagger.yaml ./

# Compile TypeScript ke folder dist
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Generate Prisma Client di production stage
RUN npx prisma generate

# Copy output build dari builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger.yaml ./swagger.yaml

# Expose port backend
EXPOSE 3001

# Start backend server
CMD ["node", "dist/index.js"]
