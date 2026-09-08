#!/bin/sh
set -eu

project_dir="artifacts/postround-web"
next_env_backup="$(mktemp)"
tsconfig_backup="$(mktemp)"
cp "$project_dir/next-env.d.ts" "$next_env_backup"
cp "$project_dir/tsconfig.json" "$tsconfig_backup"

restore_generated_config() {
  cp "$next_env_backup" "$project_dir/next-env.d.ts"
  cp "$tsconfig_backup" "$project_dir/tsconfig.json"
  rm -f "$next_env_backup" "$tsconfig_backup"
}

trap restore_generated_config EXIT INT TERM

playwright test --config "$project_dir/playwright.config.ts" "$@"