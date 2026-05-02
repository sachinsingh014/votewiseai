# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: deps
# Install ONLY production dependencies in an isolated layer.
# This means node_modules in the final image contains zero devDependencies.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copy only manifests first — maximizes layer cache hits on code-only changes
COPY package.json package-lock.json ./

# npm ci: deterministic install using lockfile, faster than npm install
RUN npm ci --omit=dev --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runner
# Minimal, hardened final image — copies only what is needed to run the app.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Security best practice: never run Node.js as root in production
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeapp --ingroup nodejs

WORKDIR /app

# Copy production node_modules from the deps stage
COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=nodeapp:nodejs src ./src
COPY --chown=nodeapp:nodejs package.json ./

# Switch to non-root user
USER nodeapp

# Expose the port the app runs on (Cloud Run maps to 8080 by default)
EXPOSE 8080

# Health-check: Cloud Run's Load Balancer will use the /api/health/liveness probe
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health/liveness', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the production server
CMD ["node", "src/server.js"]
