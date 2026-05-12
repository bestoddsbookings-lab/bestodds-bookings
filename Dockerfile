# Multi-stage build: build React client, then install server and copy build
FROM node:18-alpine AS client-builder
WORKDIR /app
# Install client deps and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci --silent
COPY client ./client
RUN cd client && npm run build

# Server stage
FROM node:18-alpine AS server
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --production --silent && npx prisma generate
COPY server ./server
# Copy client build into server/build so server can serve it
COPY --from=client-builder /app/client/build ./server/build

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/index.js"]
