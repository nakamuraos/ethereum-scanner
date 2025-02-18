# ===========================
FROM node:20-alpine as base
LABEL author="thinhhv <thinh@thinhhv.com>"
LABEL repository="https://github.com/nakamuraos/ethereum-scanner"

# Workdir
WORKDIR /app

# ===========================
FROM base as builder

# Copy & install dependencies
COPY package.json yarn.lock ./
RUN yarn

# Copy source code & build
COPY . .
RUN yarn build

# ===========================
FROM base

# Install curl
RUN apk add --no-cache curl

# Copy source built BE
COPY package.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY ./config/default.yaml ./config/default.yaml

# Env default
ENV NODE_ENV=production

# Export port
EXPOSE 8080

# Start app
CMD ["yarn", "start:prod"]
