#!/bin/bash

set -eu

PROJECT="chanting"
GIT_URL="https://github.com/mahadana/chanting.git"
BASE_DIR="/opt/$PROJECT"

if [[ "$(id -u)" != "0" ]]; then
  echo 'Must be run as root'
  exit 1
fi

function rand {
  head /dev/urandom | tr -dc A-Za-z0-9 | head -c 8
}

test -d "$BASE_DIR" || git clone "$GIT_URL" "$BASE_DIR"

if ! test -f /etc/webhook.conf.secret; then
  touch /etc/webhook.conf.secret
  chmod 600 /etc/webhook.conf.secret
  rand > /etc/webhook.conf.secret
fi

touch "/etc/webhook.conf.$PROJECT"
chmod 600 "/etc/webhook.conf.$PROJECT"
cp server/webhook.conf "/etc/webhook.conf.$PROJECT"
perl -pi -e "s/SECRET/$(cat /etc/webhook.conf.secret)/" "/etc/webhook.conf.$PROJECT"

echo "Add the contents of /etc/webhook.conf.$PROJECT to /etc/webhook.conf"
echo "GitHub Webhook URL: https://pujas.live/hooks/$PROJECT-github-deploy"
echo "GitHub Webhook Secret: $(cat /etc/webhook.conf.secret)"

"$BASE_DIR/server/github-deploy.sh"
