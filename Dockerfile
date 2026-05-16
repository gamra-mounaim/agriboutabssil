FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install only production dependencies first to save space
RUN npm install

COPY . .

# Set memory limit for Node during build
ENV NODE_OPTIONS=--max-old-space-size=450

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
