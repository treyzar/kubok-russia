#!/usr/bin/env bash
# Runs all test suites sequentially and prints a summary table.

cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SUITES=(
    "API|tests/api/run.sh"
    "Boost Calc|tests/boost_calc/run.sh"
    "WebSocket|tests/websocket/run.sh"
    "Room Management|tests/room_management/run_tests.sh"
    "Room Places|tests/room_places/run.sh"
    "Fair Rooms|tests/fair_rooms/run.sh"
    "Template Settings|tests/template_settings/run.sh"
)

declare -a RESULTS   # "suite|passed|failed|status"
OVERALL_EXIT=0

run_suite() {
    local label="$1"
    local script="$2"

    printf "${BOLD}▶ Running: %s${NC}\n" "$label"
    printf "${DIM}%s${NC}\n" "$(printf '─%.0s' {1..60})"

    local tmpfile
    tmpfile=$(mktemp)

    bash "$script" 2>&1 | tee "$tmpfile"
    local exit_code=${PIPESTATUS[0]}

    local json_line
    json_line=$(grep '^SUITE_RESULT::' "$tmpfile" | tail -1 | sed 's/^SUITE_RESULT:://')
    rm -f "$tmpfile"

    local passed=0 failed=0
    if [ -n "$json_line" ]; then
        passed=$(echo "$json_line" | grep -oP '"passed":\s*\K\d+' || echo 0)
        failed=$(echo "$json_line" | grep -oP '"failed":\s*\K\d+' || echo 0)
    fi

    local status="PASS"
    if [ "$exit_code" -ne 0 ] || [ "${failed:-0}" -gt 0 ]; then
        status="FAIL"
        OVERALL_EXIT=1
    fi

    RESULTS+=("${label}|${passed}|${failed}|${status}")
    echo ""
}

for entry in "${SUITES[@]}"; do
    IFS='|' read -r label script <<< "$entry"
    run_suite "$label" "$script"
done

# ── Summary table ─────────────────────────────────────────────────────────────

COL_SUITE=22
COL_PASS=8
COL_FAIL=8
COL_STATUS=8
TOTAL_WIDTH=$(( COL_SUITE + COL_PASS + COL_FAIL + COL_STATUS + 7 ))

pad() { printf "%-${1}s" "$2"; }
hline() { printf '─%.0s' $(seq 1 $TOTAL_WIDTH); echo; }

echo ""
printf "${BOLD}"
hline
printf "│ %s │ %s │ %s │ %s │\n" \
    "$(pad $COL_SUITE 'Suite')" \
    "$(pad $COL_PASS 'Passed')" \
    "$(pad $COL_FAIL 'Failed')" \
    "$(pad $COL_STATUS 'Status')"
hline
printf "${NC}"

TOTAL_PASS=0
TOTAL_FAIL=0

for row in "${RESULTS[@]}"; do
    IFS='|' read -r suite passed failed status <<< "$row"
    TOTAL_PASS=$(( TOTAL_PASS + passed ))
    TOTAL_FAIL=$(( TOTAL_FAIL + failed ))

    if [ "$status" = "PASS" ]; then
        color="${GREEN}"
        icon="✔"
    else
        color="${RED}"
        icon="✘"
    fi

    printf "│ %s │ ${GREEN}%s${NC} │ " \
        "$(pad $COL_SUITE "$suite")" \
        "$(pad $COL_PASS "$passed")"

    if [ "$failed" -gt 0 ]; then
        printf "${RED}%s${NC} │ " "$(pad $COL_FAIL "$failed")"
    else
        printf "%s │ " "$(pad $COL_FAIL "$failed")"
    fi

    printf "${color}%s${NC} │\n" "$(pad $COL_STATUS "$icon $status")"
done

hline

# Totals row
if [ "$OVERALL_EXIT" -eq 0 ]; then
    total_color="${GREEN}"
    total_icon="✔"
    total_label="ALL PASS"
else
    total_color="${RED}"
    total_icon="✘"
    total_label="FAILURES"
fi

printf "${BOLD}│ %s │ ${GREEN}%s${NC}${BOLD} │ " \
    "$(pad $COL_SUITE 'TOTAL')" \
    "$(pad $COL_PASS "$TOTAL_PASS")"

if [ "$TOTAL_FAIL" -gt 0 ]; then
    printf "${RED}%s${NC}${BOLD} │ " "$(pad $COL_FAIL "$TOTAL_FAIL")"
else
    printf "%s │ " "$(pad $COL_FAIL "$TOTAL_FAIL")"
fi

printf "${total_color}%s${NC}${BOLD} │\n" "$(pad $COL_STATUS "$total_icon $total_label")"
hline
printf "${NC}"
echo ""

exit $OVERALL_EXIT
