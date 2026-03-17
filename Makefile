.PHONY: help dev build clean

WAILS ?= wails
TAGS ?= webkit2_41

help:
	@echo "Targets:"
	@echo "  make dev        - Run wails dev with tags ($(TAGS))"
	@echo "  make build      - Run wails build with tags ($(TAGS))"
	@echo "  make clean      - Remove build artifacts"
	@echo ""
	@echo "Vars:"
	@echo "  TAGS=...        - Override build tags (default: $(TAGS))"
	@echo "  ARGS=...        - Extra args forwarded to wails"

dev:
	$(WAILS) dev -tags "$(TAGS)" $(ARGS)

build:
	$(WAILS) build -tags "$(TAGS)" $(ARGS)

clean:
	rm -rf build/bin
