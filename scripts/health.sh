#!/usr/bin/env bash
# health.sh — Skills health dashboard
# Shows trigger frequency and health status for all skills in source/

set -euo pipefail

SKILLS_DIR="${SKILLS_DIR:-$HOME/shared-skills/source}"
METRICS_DIR="${METRICS_DIR:-$HOME/shared-skills/metrics}"
TRIGGERS_FILE="$METRICS_DIR/triggers.jsonl"
THIRTY_DAYS_AGO=$(date -d '30 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-30d '+%Y-%m-%d')

# ANSI colours (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' YELLOW='' RED='' CYAN='' BOLD='' RESET=''
fi

# Collect skill names from directory-based skills only
mapfile -t SKILL_NAMES < <(
  find "$SKILLS_DIR" -maxdepth 2 -name "SKILL.md" |
    sed "s|$SKILLS_DIR/||; s|/SKILL.md||" |
    sort
)

if [ ${#SKILL_NAMES[@]} -eq 0 ]; then
  echo "No skills found in $SKILLS_DIR"
  exit 0
fi

# Header
printf "\n${BOLD}%-40s %8s %12s %10s${RESET}\n" "SKILL" "30d USES" "LAST USED" "HEALTH"
printf "%-40s %8s %12s %10s\n" "$(printf '%0.s-' {1..40})" "--------" "------------" "----------"

for skill in "${SKILL_NAMES[@]}"; do
  count30=0
  last_used="never"
  ever_used=0

  if [ -f "$TRIGGERS_FILE" ]; then
    # Count triggers in last 30 days
    count30=$(grep "\"skill\":\"$skill\"" "$TRIGGERS_FILE" 2>/dev/null |
      awk -F'"' '{
        for(i=1;i<=NF;i++) if($i=="date") { date=$(i+2); break }
        print date
      }' |
      awk -v cutoff="$THIRTY_DAYS_AGO" '$0 >= cutoff' |
      wc -l || echo 0)

    # Last used date across all time
    last_used=$(grep "\"skill\":\"$skill\"" "$TRIGGERS_FILE" 2>/dev/null |
      awk -F'"' '{
        for(i=1;i<=NF;i++) if($i=="date") { date=$(i+2); break }
        print date
      }' |
      sort |
      tail -1 || echo "")

    if [ -n "$last_used" ]; then
      ever_used=1
    else
      last_used="never"
    fi
  fi

  # Determine health
  if [ "$ever_used" -eq 0 ]; then
    health="new"
    colour="$CYAN"
  elif [ "$count30" -eq 0 ]; then
    health="stale"
    colour="$RED"
  elif [ "$count30" -lt 3 ]; then
    health="low"
    colour="$YELLOW"
  else
    health="healthy"
    colour="$GREEN"
  fi

  printf "${colour}%-40s %8d %12s %10s${RESET}\n" \
    "$skill" "$count30" "$last_used" "$health"
done

# Summary counts
total=${#SKILL_NAMES[@]}
new_count=0
stale_count=0
low_count=0
healthy_count=0

if [ -f "$TRIGGERS_FILE" ]; then
  for skill in "${SKILL_NAMES[@]}"; do
    c30=$(grep "\"skill\":\"$skill\"" "$TRIGGERS_FILE" 2>/dev/null |
      awk -F'"' '{for(i=1;i<=NF;i++) if($i=="date"){print $(i+2);break}}' |
      awk -v cutoff="$THIRTY_DAYS_AGO" '$0 >= cutoff' | wc -l || echo 0)
    ever=$(grep -c "\"skill\":\"$skill\"" "$TRIGGERS_FILE" 2>/dev/null || echo 0)

    if [ "$ever" -eq 0 ]; then
      ((new_count++)) || true
    elif [ "$c30" -eq 0 ]; then
      ((stale_count++)) || true
    elif [ "$c30" -lt 3 ]; then
      ((low_count++)) || true
    else
      ((healthy_count++)) || true
    fi
  done
else
  new_count=$total
fi

printf "\n${BOLD}Summary:${RESET} %d skills total — " "$total"
printf "${CYAN}%d new${RESET}  " "$new_count"
printf "${GREEN}%d healthy${RESET}  " "$healthy_count"
printf "${YELLOW}%d low${RESET}  " "$low_count"
printf "${RED}%d stale${RESET}\n" "$stale_count"
printf "Metrics file: %s\n\n" "${TRIGGERS_FILE:-not found}"
