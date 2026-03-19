#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-computo-de-obra}"
APP_LABEL="${APP_LABEL:-Computo de Obra}"
APP_VERSION="${APP_VERSION:-0.1.0}"
ARCH="${ARCH:-amd64}"
TAGS="${TAGS:-webkit2_41}"
DESCRIPTION="${DESCRIPTION:-Aplicacion de computo de obra}"
BIN_PATH="build/bin/${APP_NAME}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

echo "==> Checking dependencies"
require_cmd wails
require_cmd fpm

echo "==> Building Linux binary with Wails"
wails build -clean -platform "linux/${ARCH}" -tags "${TAGS}"

if [[ ! -f "${BIN_PATH}" ]]; then
  echo "Expected binary not found at ${BIN_PATH}" >&2
  exit 1
fi

cat > "build/bin/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=${APP_LABEL}
Exec=/opt/${APP_NAME}/${APP_NAME}
Icon=${APP_NAME}
Categories=Office;
Terminal=false
EOF

EXTRA_FPM_ARGS=()
if [[ -n "${MAINTAINER:-}" ]]; then
  EXTRA_FPM_ARGS+=(--maintainer "${MAINTAINER}")
fi
if [[ -n "${URL:-}" ]]; then
  EXTRA_FPM_ARGS+=(--url "${URL}")
fi
if [[ -n "${LICENSE:-}" ]]; then
  EXTRA_FPM_ARGS+=(--license "${LICENSE}")
fi

echo "==> Creating .deb package with fpm"
fpm -s dir -t deb \
  -n "${APP_NAME}" \
  -v "${APP_VERSION}" \
  --architecture "${ARCH}" \
  --description "${DESCRIPTION}" \
  "${EXTRA_FPM_ARGS[@]}" \
  --deb-no-default-config-files \
  --prefix "/opt/${APP_NAME}" \
  --package "build/bin/${APP_NAME}_${APP_VERSION}_${ARCH}.deb" \
  "${BIN_PATH}=/opt/${APP_NAME}/${APP_NAME}" \
  "build/appicon.png=/usr/share/icons/hicolor/256x256/apps/${APP_NAME}.png" \
  "build/bin/${APP_NAME}.desktop=/usr/share/applications/${APP_NAME}.desktop"

echo "==> .deb generated at build/bin/${APP_NAME}_${APP_VERSION}_${ARCH}.deb"
