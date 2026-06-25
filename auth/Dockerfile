# Better-Auth server — runs on Hugging Face Spaces (Docker SDK) or any Node host.
# HF Spaces serves on port 7860.
FROM node:20-slim

ENV NODE_ENV=production \
    PORT=7860

WORKDIR /app

# Install deps (including tsx, used to run the TS server) before copying source.
COPY package*.json ./
RUN npm ci --include=dev

COPY . .

EXPOSE 7860

CMD ["npm", "start"]
