.PHONY: help dev build clean \
	build-linux build-windows build-macos \
	installer-linux-deb installer-linux-appimage installer-windows installer-macos \
	sync-icon

WAILS ?= wails
TAGS ?= webkit2_41
PLATFORM ?=
APP_VERSION ?= 0.1.0
APP_ICON_SOURCE ?= computo-de-obra.png
APP_ICON_TARGET ?= build/appicon.png

help:
	@echo "Targets:"
	@echo "  make dev        - Run wails dev with tags ($(TAGS))"
	@echo "  make build      - Run wails build with tags ($(TAGS))"
	@echo "  make clean      - Remove build artifacts"
	@echo ""
	@echo "Cross-platform build:"
	@echo "  make build-linux       - Build Linux binary"
	@echo "  make build-windows     - Build Windows binary"
	@echo "  make build-macos       - Build macOS app"
	@echo ""
	@echo "Installers:"
	@echo "  make installer-linux-deb       - Build Linux .deb using fpm"
	@echo "  make installer-linux-appimage  - Build Linux .AppImage"
	@echo "  make installer-windows         - Build Windows NSIS installer"
	@echo "  make installer-macos           - Build macOS app bundle (package as DMG externally)"
	@echo ""
	@echo "Vars:"
	@echo "  TAGS=...        - Override build tags (default: $(TAGS))"
	@echo "  APP_VERSION=... - Package version for Linux installers (default: $(APP_VERSION))"
	@echo "  APP_ICON_SOURCE - Icon source PNG (default: $(APP_ICON_SOURCE))"
	@echo "  PLATFORM=...    - Override target platform for build target"
	@echo "  ARGS=...        - Extra args forwarded to wails"

dev: sync-icon
	$(WAILS) dev -tags "$(TAGS)" $(ARGS)

build: sync-icon
	$(WAILS) build -tags "$(TAGS)" $(ARGS)

build-linux: sync-icon
	$(WAILS) build -clean -platform "$${PLATFORM:-linux/amd64}" -tags "$(TAGS)" $(ARGS)

build-windows: sync-icon
	rm -f build/windows/icon.ico
	$(WAILS) build -clean -platform "$${PLATFORM:-windows/amd64}" $(ARGS)

build-macos: sync-icon
	$(WAILS) build -clean -platform "$${PLATFORM:-darwin/universal}" $(ARGS)

installer-linux-deb: sync-icon
	APP_VERSION="$(APP_VERSION)" TAGS="$(TAGS)" bash "./scripts/build_linux_deb.sh"

installer-linux-appimage: sync-icon
	APP_VERSION="$(APP_VERSION)" TAGS="$(TAGS)" bash "./scripts/build_linux_appimage.sh"

installer-windows: sync-icon
	rm -f build/windows/icon.ico
	$(WAILS) build -clean -platform "$${PLATFORM:-windows/amd64}" -nsis $(ARGS)

installer-macos: sync-icon
	$(WAILS) build -clean -platform "$${PLATFORM:-darwin/universal}" $(ARGS)
	@echo "macOS .app generated in build/bin. Package as .dmg with create-dmg or hdiutil."

sync-icon:
	@test -f "$(APP_ICON_SOURCE)" || (echo "Missing icon source: $(APP_ICON_SOURCE)" && exit 1)
	@mkdir -p "$(dir $(APP_ICON_TARGET))"
	cp "$(APP_ICON_SOURCE)" "$(APP_ICON_TARGET)"

clean:
	rm -rf build/bin
