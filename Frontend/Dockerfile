# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# The VITE_API_URL is now passed during `docker compose up` or via environment files,
# making the build more generic. If you need build-time variables, add them here.
RUN npm run build

# Stage 2: Serve the application with NGINX
FROM nginx:1.25-alpine

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
