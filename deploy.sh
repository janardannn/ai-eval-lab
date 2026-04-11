#!/usr/bin/env bash
# Demo deploy driver for ai-eval-lab on EC2.
#
# Usage:
#   ./deploy.sh up        # start EC2, print IP + GoDaddy records to update
#   ./deploy.sh down      # stop EC2
#   ./deploy.sh status    # show instance state + current public IP
#   ./deploy.sh ssh       # ssh into the instance
#   ./deploy.sh logs      # tail docker compose logs
#   ./deploy.sh boot      # on-instance: build + bring compose up (run after IP change)
#
# Required env (put in ~/.ai-eval-lab.env and `source` it):
#   EC2_INSTANCE_ID   e.g. i-0abc123
#   EC2_REGION        e.g. ap-south-1
#   EC2_KEY           path to .pem
#   EC2_USER          default: ubuntu
#   DOMAIN            ai-eval-lab.janardan.xyz
#   VNC_DOMAIN        vnc.ai-eval-lab.janardan.xyz
#   POSTGRES_PASSWORD any string
set -euo pipefail

: "${EC2_INSTANCE_ID:?set EC2_INSTANCE_ID}"
: "${EC2_REGION:?set EC2_REGION}"
: "${EC2_KEY:?set EC2_KEY (path to .pem)}"
: "${DOMAIN:?set DOMAIN}"
: "${VNC_DOMAIN:?set VNC_DOMAIN}"
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}"
EC2_USER="${EC2_USER:-ubuntu}"

AWS="aws --region $EC2_REGION"

get_ip() {
  $AWS ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
}

get_state() {
  $AWS ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].State.Name' --output text
}

cmd_up() {
  echo "→ starting $EC2_INSTANCE_ID"
  $AWS ec2 start-instances --instance-ids "$EC2_INSTANCE_ID" >/dev/null
  $AWS ec2 wait instance-running --instance-ids "$EC2_INSTANCE_ID"
  IP=$(get_ip)
  echo ""
  echo "  instance is running"
  echo "  public IP: $IP"
  echo ""
  echo "  update these GoDaddy A records (TTL 600):"
  echo "    $DOMAIN      →  $IP"
  echo "    $VNC_DOMAIN  →  $IP"
  echo ""
  echo "  then: ./deploy.sh boot"
}

cmd_down() {
  echo "→ stopping $EC2_INSTANCE_ID"
  $AWS ec2 stop-instances --instance-ids "$EC2_INSTANCE_ID" >/dev/null
  echo "  stop requested (will take ~30s to fully stop)"
}

cmd_status() {
  STATE=$(get_state)
  echo "state: $STATE"
  if [ "$STATE" = "running" ]; then
    echo "ip:    $(get_ip)"
  fi
}

cmd_ssh() {
  IP=$(get_ip)
  ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$IP"
}

cmd_logs() {
  IP=$(get_ip)
  ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$IP" \
    "cd ai-eval-lab/docker && docker compose -f docker-compose.prod.yml logs -f --tail=100"
}

cmd_boot() {
  IP=$(get_ip)
  echo "→ booting compose on $IP"
  ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$IP" bash -s <<EOF
set -e
cd ai-eval-lab
git pull
cd docker
export DOMAIN="$DOMAIN"
export VNC_DOMAIN="$VNC_DOMAIN"
export VNC_HOST_PORT=6080
export MAX_CONTAINERS=1
export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T web npx prisma migrate deploy
echo ""
echo "  app:  https://$DOMAIN"
echo "  vnc:  https://$VNC_DOMAIN"
EOF
}

case "${1:-}" in
  up)     cmd_up ;;
  down)   cmd_down ;;
  status) cmd_status ;;
  ssh)    cmd_ssh ;;
  logs)   cmd_logs ;;
  boot)   cmd_boot ;;
  *)      echo "usage: $0 {up|down|status|ssh|logs|boot}"; exit 1 ;;
esac
