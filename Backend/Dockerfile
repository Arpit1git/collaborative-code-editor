FROM ubuntu:22.04

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install build tools, compilers, and runtimes (GCC, G++, Python3, JDK)
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    gcc \
    g++ \
    make \
    python3 \
    python3-pip \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 3. Set working directory
WORKDIR /usr/src/app

# 4. Copy package manifests and install backend dependencies (builds node-pty)
COPY package*.json ./
RUN npm install

# 5. Copy backend source code
COPY . .

# 6. Expose default port
EXPOSE 8000

# 7. Start backend server
CMD ["npm", "start"]
