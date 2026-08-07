# Use the official Bun image with fixed version for reproducibility
FROM oven/bun:1.2.20

# Set working directory to root
WORKDIR /app

# Copy root package.json and lockfile first for better layer caching
COPY package.json bun.lock ./

# Copy packages for workspace dependencies
COPY packages ./packages

# Copy API package.json to its proper location
COPY apps/api/package.json ./apps/api/

# Copy web package.json to its proper location
COPY apps/web/package.json ./apps/web/

# Install dependencies (this layer will be cached if package files don't change)
RUN bun install --frozen-lockfile

# Copy API source code
COPY apps/api/src ./apps/api/src

# Must match the PORT the app binds (apps/api/src/constants.ts) and the
# proxy_pass target in nginx. Changing one without the others publishes a port
# nothing is listening on.
EXPOSE 3021

# Migrations are deliberately NOT run here. A build step runs at image-build
# time, against whatever database the builder can reach — not the one this image
# will be deployed against. Run them as their own step before starting the new
# container: `./apps/api/deploy.sh migrate`.

# Drop root. The app only ever reads from /app, so the copied files staying
# root-owned is what we want.
USER bun

# Start the application
CMD ["bun", "run", "--filter=api", "start"]