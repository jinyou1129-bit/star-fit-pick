#!/usr/bin/env bash
# 스타핏픽 → Netlify 수동 배포 스크립트
#   NETLIFY_AUTH_TOKEN=... ./tools/deploy_netlify.sh
# (Netlify → User settings → Applications → Personal access tokens 에서 발급)
# 저장소에는 토큰을 절대 넣지 않습니다.
set -euo pipefail
: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN 환경변수가 필요합니다}"
SITE_ID="${NETLIFY_SITE_ID:-1999c7f0-f1a3-4eab-9d81-b1c0dcf04f15}"
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
python3 - "$TMP/site.zip" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ('.git', '.github', '__pycache__')]
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
PY
curl -sS -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary @"$TMP/site.zip" > "$TMP/deploy.json"
python3 - "$TMP/deploy.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print("deploy id:", d.get("id"), "state:", d.get("state"), "ssl_url:", d.get("ssl_url"))
PY
echo "https://starfitpick.netlify.app/ 로 반영됩니다."
