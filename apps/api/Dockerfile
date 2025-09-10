# Use the official Bun image with fixed version for reproducibility
FROM oven/bun:1.2.0

# Set working directory to root
WORKDIR /app

# Copy root package.json and lockfile first for better layer caching
COPY ../../package.json ../../bun.lock ./

# Copy packages for workspace dependencies
COPY ../../packages ./packages

# Copy API package.json to its proper location
COPY package.json ./apps/api/

# Install dependencies (this layer will be cached if package files don't change)
RUN bun install --frozen-lockfile

# Copy API source code
COPY src ./apps/api/src

# Expose the port
EXPOSE 3001

# Run database migrations (optional, uncomment if needed)
RUN bun run db:migrate

# Start the application
CMD ["bun", "run", "--filter=api", "start"]