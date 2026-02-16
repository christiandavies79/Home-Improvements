# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install

# Install client dependencies
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install

# Copy source
COPY server/ ./server/
COPY client/ ./client/

# Build client
RUN cd client && npm run build

# Build server
RUN cd server && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production server dependencies only
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production

# Copy built assets
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Create data directory
RUN mkdir -p /app/data/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "server/dist/index.js"]
