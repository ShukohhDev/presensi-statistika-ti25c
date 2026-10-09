FROM node:20-alpine

# Install build tools untuk native binding better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Salin file konfigurasi dependensi
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Pasang dependensi
RUN npm install
RUN npm install --prefix server
RUN npm install --prefix client

# Salin seluruh kode proyek
COPY . .

# Bangun bundle frontend produksi
RUN npm run build --prefix client

# Konfigurasi port (Port default Hugging Face Spaces adalah 7860)
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Jalankan server
CMD ["npm", "start"]
