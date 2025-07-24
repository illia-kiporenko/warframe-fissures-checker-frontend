# Stage 1: Build the React app using Node 22.14
FROM node:22.14.0 AS build

WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 3000

