FROM python:3.11-slim

# Node.js (for n8n), nginx (path routing), supervisor (process manager)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg nginx supervisor gettext-base \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g n8n \
    && apt-get purge -y curl gnupg \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf.template /etc/nginx/conf.d/app.conf.template
COPY supervisord.conf /etc/supervisor/conf.d/app.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV N8N_PORT=5678 \
    N8N_PATH=/n8n/ \
    N8N_PROTOCOL=https \
    N8N_EDITOR_BASE_URL=/n8n/ \
    NODE_ENV=production \
    PORT=8080

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
