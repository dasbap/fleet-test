#!/usr/bin/env bash
set -euo pipefail

echo "E-Samba - Audit performance"
echo "================================"

BUNDLE_BUDGET_BYTES="${BUNDLE_BUDGET_BYTES:-204800}"

echo ""
echo "Build de production..."
npm run build

echo ""
echo "Tailles des chunks JavaScript (gzip/brotli)"
echo "--------------------------------"
shopt -s nullglob
for file in dist/assets/*.js; do
  ORIG=$(wc -c < "$file")
  GZ=$(gzip -c "$file" | wc -c)
  BR=$(brotli -c "$file" | wc -c)
  NAME=$(basename "$file")
  printf "  %-45s original=%8s gzip=%8s brotli=%8s\n" "$NAME" "$ORIG" "$GZ" "$BR"
done

echo ""
echo "Calcul du bundle initial (index + vendor critiques)..."
TOTAL_GZ=0
for pattern in dist/assets/vendor-react*.js dist/assets/vendor-router*.js dist/assets/index*.js; do
  for file in $pattern; do
    if [ -f "$file" ]; then
      GZ=$(gzip -c "$file" | wc -c)
      TOTAL_GZ=$((TOTAL_GZ + GZ))
    fi
  done
done
echo "Bundle initial estime (gzip): ${TOTAL_GZ} bytes"

if [ "$TOTAL_GZ" -gt "$BUNDLE_BUDGET_BYTES" ]; then
  echo "ECHEC: bundle initial > budget (${BUNDLE_BUDGET_BYTES} bytes)"
  echo "Conseil: npm run build:analyze"
  exit 1
fi
echo "OK: bundle initial sous le budget"

echo ""
echo "Images non optimisees (public/images)"
if [ -d "public/images" ]; then
  NON_OPT=$(find public/images \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | wc -l)
  WEBP=$(find public/images -name "*.webp" | wc -l)
else
  NON_OPT=0
  WEBP=0
fi
echo "JPEG/PNG: ${NON_OPT} | WEBP: ${WEBP}"
if [ "$NON_OPT" -gt "$WEBP" ]; then
  echo "Attention: lancer 'npm run images' pour generer davantage de WebP."
fi

echo ""
echo "================================"
echo "Audit termine"
