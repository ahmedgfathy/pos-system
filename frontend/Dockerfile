FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# The browser uses the exposed backend on localhost during local Docker runs
# and relative /api URLs when deployed behind nginx.
RUN EXPO_PUBLIC_API_URL= npx expo export --platform web

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
