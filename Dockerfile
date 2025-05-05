FROM node:18-slim

WORKDIR /app

# Install dependencies required for bcrypt and networking tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy all files
COPY . .

# Make the wait-for-it script executable
RUN chmod +x wait-for-it.sh

# Rebuild bcrypt from source to ensure it's compatible with the current environment
RUN npm rebuild bcrypt --build-from-source

# Update the EXPOSE port to match the new port in docker-compose.yml
EXPOSE 3004

CMD ["npm", "run", "dev"]
