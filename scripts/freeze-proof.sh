#!/usr/bin/env bash
# freeze-proof.sh — Helper for the live freeze ceremony.
# Usage: ./scripts/freeze-proof.sh <univ/subject> <YYYY-MM>
#
# This script:
# 1. Runs `kya freeze` to produce canonical prediction + sheet + manifest entry
# 2. Prints exact commands for the three-witness protocol:
#    a. Git tag
#    b. OpenTimestamps stamp
#    c. Wayback Machine snapshot
#
# The human must execute the witness commands manually (they require
# network access and authentication that this script deliberately avoids).

set -euo pipefail

REL="${1:?Usage: freeze-proof.sh <univ/subject> <YYYY-MM>}"
AS_OF="${2:?Usage: freeze-proof.sh <univ/subject> <YYYY-MM>}"
ROOT="${3:-./ledger}"

echo "═══════════════════════════════════════════════════════════"
echo "  KyaAayega Live Freeze Ceremony"
echo "  Subject: $REL"
echo "  As-of:   $AS_OF"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Freeze
echo "▶ Step 1/4: Freezing prediction and sheet..."
npx tsx src/cli.ts freeze "$REL" --as-of "$AS_OF" --status live --ledger "$ROOT"
echo ""

# Extract run name
RUN_NAME="${REL//\//-}-${AS_OF}-live"
TAG="freeze/${REL}/${AS_OF}"
PRED_PATH="$ROOT/$REL/runs/${AS_OF}-live/prediction.json"
SHEET_PATH="$ROOT/$REL/runs/${AS_OF}-live/sheet.html"

# Step 2: Verify
echo "▶ Step 2/4: Verifying manifest integrity..."
npx tsx src/cli.ts verify --ledger "$ROOT"
echo "  ✓ Manifest verified"
echo ""

# Step 3: Print witness commands
echo "▶ Step 3/4: Commit and tag"
echo ""
echo "  Run these commands now:"
echo ""
echo "    git add $ROOT/manifest.json $PRED_PATH $SHEET_PATH"
echo "    git commit -m \"data: freeze $REL $AS_OF live\""
echo "    git tag -a \"$TAG\" -m \"Live freeze: $REL as-of $AS_OF\""
echo "    git push origin main --tags"
echo ""

echo "▶ Step 4/4: Third-party witnesses"
echo ""
echo "  a) OpenTimestamps (requires ots CLI — pip install opentimestamps-client):"
echo ""
echo "    ots stamp $PRED_PATH"
echo "    git add ${PRED_PATH}.ots"
echo "    git commit -m \"proof: OTS stamp for $REL $AS_OF\""
echo "    git push"
echo ""
echo "  b) Wayback Machine (visit this URL and trigger a save):"
echo ""
echo "    https://web.archive.org/save/https://github.com/GarvitAgrawal04/KyaAayega/blob/$TAG/$PRED_PATH"
echo ""
echo "  c) Update manifest.json with the OTS and Wayback URLs:"
echo ""
echo "    - Add the .ots filename to the run's 'ots' array"
echo "    - Add the Wayback URL to the run's 'wayback' array"
echo "    - git commit -m \"proof: add OTS and Wayback refs for $REL $AS_OF\""
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ Freeze complete. Witnesses are your responsibility."
echo "  The frozen prediction CANNOT be modified."
echo "  Score after the exam with: npm run kya -- score-run $REL ${AS_OF}-live"
echo "═══════════════════════════════════════════════════════════"
