FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git bash curl
RUN npm install -g @expo/cli@latest
COPY package*.json app.json ./
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 19000 8081
CMD ["npx", "expo", "start", "--port", "19000", "--host", "localhost"]
