#!/bin/sh
set -e

export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/conf.d/app.conf.template > /etc/nginx/conf.d/app.conf

exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/app.conf
