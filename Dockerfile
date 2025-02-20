# ===========================
FROM node:20-alpine AS base
LABEL author="thinhhv <thinh@thinhhv.com>"
LABEL repository="https://github.com/nakamuraos/ethereum-scanner"

# Workdir
WORKDIR /app

# ===========================
FROM base AS builder

# Copy & install dependencies
COPY package*.json ./
RUN npm i

# Copy source code & build
COPY . .
RUN npm run build

# ===========================
FROM base AS deps

# Copy & install dependencies
COPY package*.json ./
RUN npm i --omit=dev

# ===========================
FROM base

# Install curl
RUN apk add --no-cache curl

# Copy source built BE
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY ./config/default.yaml ./config/default.yaml

# Env default
ENV NODE_ENV=production

# Export port
EXPOSE 8080

# Start app
CMD ["yarn", "start:prod"]
