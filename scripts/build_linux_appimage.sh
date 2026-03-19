#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-computo-de-obra}"
APP_LABEL="${APP_LABEL:-Computo de Obra}"
APP_VERSION="${APP_VERSION:-0.1.0}"
ARCH="${ARCH:-amd64}"
TAGS="${TAGS:-webkit2_41}"
ROOT_DIR="$(pwd)"
APPDIR="${ROOT_DIR}/build/AppDir"
BIN_PATH="${ROOT_DIR}/build/bin/${APP_NAME}"
ARCH_TAG="x86_64"
TOOLS_DIR="${TOOLS_DIR:-${ROOT_DIR}/tools}"
APPIMAGETOOL_URL="${APPIMAGETOOL_URL:-https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage}"
APPIMAGETOOL="${APPIMAGETOOL:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

download_file() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "${url}" -o "${out}"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "${out}" "${url}"
    return
  fi
  echo "Missing downloader: install curl or wget" >&2
  exit 1
}

ensure_appimagetool() {
  if [[ -n "${APPIMAGETOOL}" ]]; then
    if [[ ! -x "${APPIMAGETOOL}" ]]; then
      echo "APPIMAGETOOL is set but not executable: ${APPIMAGETOOL}" >&2
      exit 1
    fi
    return
  fi

  if command -v appimagetool >/dev/null 2>&1; then
    APPIMAGETOOL="$(command -v appimagetool)"
    return
  fi

  APPIMAGETOOL="${TOOLS_DIR}/appimagetool"
  mkdir -p "${TOOLS_DIR}"
  if [[ ! -x "${APPIMAGETOOL}" ]]; then
    echo "==> appimagetool not found, downloading local copy"
    download_file "${APPIMAGETOOL_URL}" "${APPIMAGETOOL}"
    chmod +x "${APPIMAGETOOL}"
  fi
}

run_appimagetool() {
  local appdir="$1"
  local output="$2"
  if "${APPIMAGETOOL}" "${appdir}" "${output}"; then
    return
  fi

  echo "==> Retrying with APPIMAGE_EXTRACT_AND_RUN=1 (FUSE fallback)"
  APPIMAGE_EXTRACT_AND_RUN=1 "${APPIMAGETOOL}" "${appdir}" "${output}"
}

if [[ "${ARCH}" != "amd64" ]]; then
  echo "Unsupported ARCH=${ARCH}. This script currently supports amd64 only." >&2
  exit 1
fi

echo "==> Checking dependencies"
require_cmd wails
ensure_appimagetool

echo "==> Building Linux binary with Wails"
wails build -clean -platform "linux/${ARCH}" -tags "${TAGS}"

if [[ ! -f "${BIN_PATH}" ]]; then
  echo "Expected binary not found at ${BIN_PATH}" >&2
  exit 1
fi

echo "==> Preparing AppDir"
rm -rf "${APPDIR}"
mkdir -p "${APPDIR}/usr/bin" \
  "${APPDIR}/usr/share/applications" \
  "${APPDIR}/usr/share/icons/hicolor/256x256/apps"

cp "${BIN_PATH}" "${APPDIR}/usr/bin/${APP_NAME}"
cp "${ROOT_DIR}/build/appicon.png" "${APPDIR}/usr/share/icons/hicolor/256x256/apps/${APP_NAME}.png"
cp "${ROOT_DIR}/build/appicon.png" "${APPDIR}/${APP_NAME}.png"
ln -sf "${APP_NAME}.png" "${APPDIR}/.DirIcon"

cat > "${APPDIR}/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=${APP_LABEL}
Exec=${APP_NAME}
Icon=${APP_NAME}
Categories=Office;
Terminal=false
EOF

cp "${APPDIR}/${APP_NAME}.desktop" "${APPDIR}/usr/share/applications/${APP_NAME}.desktop"

cat > "${APPDIR}/AppRun" <<EOF
#!/bin/sh
HERE="\$(dirname "\$(readlink -f "\$0")")"
exec "\$HERE/usr/bin/${APP_NAME}" "\$@"
EOF

chmod +x "${APPDIR}/AppRun"
chmod +x "${APPDIR}/usr/bin/${APP_NAME}"

OUTPUT="${ROOT_DIR}/build/bin/${APP_NAME}-${APP_VERSION}-${ARCH_TAG}.AppImage"
echo "==> Generating AppImage"
run_appimagetool "${APPDIR}" "${OUTPUT}"
chmod +x "${OUTPUT}"

echo "==> AppImage generated at ${OUTPUT}"
