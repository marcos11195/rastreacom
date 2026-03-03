FROM node:20

# Instalamos dependencias reales para Chromium en Debian
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

# Instalación de dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código (incluyendo src, views y public)
COPY . .

EXPOSE 3000

# El comando se sobreescribe en el docker-compose.yml, 
# pero dejamos este como fallback por defecto
CMD ["npm", "run", "dev"]