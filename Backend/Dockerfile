# Stage 1: Build
# Use a specific Node.js version on Alpine for a smaller base
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Stage 2: Production
# Use a minimal Node.js image for the final stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code from the builder stage
COPY --from=builder /app .

# Expose the application port
EXPOSE 5000

# Run the application with a non-root user for better security
# USER node

# Start the server
CMD ["node", "server.js"]
