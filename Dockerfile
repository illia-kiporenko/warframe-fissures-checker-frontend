# Use official Node image as the builder
FROM node:22.14.0-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies and build the app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:alpine

# Copy the built frontend from the builder (corrected folder: build)
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 (default for nginx)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
