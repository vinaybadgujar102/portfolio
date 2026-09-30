#!/usr/bin/env bash
# Refresh GitHub contribution data via `gh` for the portfolio heatmap.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/js/contributions.json"
USERNAME="${1:-vinaybadgujar102}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: Not logged in. Run: gh auth login" >&2
  exit 1
fi

gh api graphql -f query="
query {
  user(login: \"$USERNAME\") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
            weekday
          }
        }
      }
    }
  }
}" --jq "{
  username: \"$USERNAME\",
  fetchedAt: (now | todate),
  totalContributions: .data.user.contributionsCollection.contributionCalendar.totalContributions,
  weeks: [.data.user.contributionsCollection.contributionCalendar.weeks[] | {
    days: [.contributionDays[] | {
      date,
      count: .contributionCount,
      color,
      weekday
    }]
  }]
}" > "$OUT"

TOTAL="$(jq -r '.totalContributions' "$OUT")"
echo "Wrote $OUT ($TOTAL contributions for @$USERNAME)"
