FROM oven/bun:1 AS base
WORKDIR /app

# Tahap 1: pasang dependensi produksi (di-cache selama package.json tidak berubah)
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Tahap 2: image akhir
FROM base AS release
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
