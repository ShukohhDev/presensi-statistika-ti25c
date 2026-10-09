FROM node:20-slim

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

# Konfigurasi environment produksi
ENV NODE_ENV=production

# Jalankan server
CMD ["npm", "start"]
