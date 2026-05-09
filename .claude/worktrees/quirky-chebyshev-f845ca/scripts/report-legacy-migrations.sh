#!/usr/bin/env bash
set -euo pipefail

shopt -s nullglob
legacy_files=()

for file in supabase/migrations/*.sql; do
  filename="$(basename "$file")"
  if [[ "$filename" =~ ^[0-9]{8}_[a-z0-9_]+\.sql$ ]]; then
    legacy_files+=("$file")
  fi
done

if [ ${#legacy_files[@]} -eq 0 ]; then
  echo "Aucune migration legacy détectée."
  exit 0
fi

echo "Migrations legacy détectées (format YYYYMMDD_description.sql) :"
printf '%s\n' "${legacy_files[@]}" | sort
