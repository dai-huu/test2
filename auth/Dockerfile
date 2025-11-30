FROM node:14-alpine

WORKDIR /app
COPY package.json package-lock.json ./
# Phải cài đặt tất cả dependencies để OpenTelemetry có thể hoạt động đúng
RUN npm install
COPY . .

# Biên dịch Typescript sang JavaScript
# Lệnh này sẽ tạo ra file build/instrument.js và build/index.js
RUN npm run build 

# --- LỆNH KHỞI ĐỘNG CÓ TIÊM TRACING (RẤT QUAN TRỌNG) ---
# Yêu cầu Node.js nạp file instrument.js TRƯỚC khi nạp index.js
CMD ["node", "--require", "./build/instrument.js", "./build/index.js"]