# Stage 1: Build the React app using Node 22.14
FROM node:22.14.0 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the build with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Optional: custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 6060
CMD ["nginx", "-g", "daemon off;"]
