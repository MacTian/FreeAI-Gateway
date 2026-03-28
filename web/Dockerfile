FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY web/server/package*.json ./
RUN npm install
COPY web/server/ ./
COPY src/shared/ ../src/shared/

FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY web/client/package*.json ./
RUN npm install
COPY web/client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Copy server
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/src ./src

# Copy built frontend
COPY --from=client-builder /app/client/dist ./client/dist

# Serve static files from Express
RUN cd server && npm install

EXPOSE 3000

WORKDIR /app/server
CMD ["node_modules/.bin/tsx", "index.ts"]
