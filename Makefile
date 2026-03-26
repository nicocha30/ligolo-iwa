# ==========================================
# CONFIGURATION
# ==========================================

# Directory containing compiled sources
BUILD_DIR := dist

# Output directory for .wbn and .swbn files
OUT_DIR := out

# Output filenames
APP_NAME := ligolo-iwa
UNSIGNED_BUNDLE := $(OUT_DIR)/$(APP_NAME).wbn
SIGNED_BUNDLE := $(OUT_DIR)/$(APP_NAME).swbn

# Private key for signing (Ed25519)
KEY_FILE := keys/ed25519.key

# Build command (e.g., npm run build, yarn build)
BUILD_CMD := npm run build
WBN_SIGN := npx wbn-sign
WBN_DUMP_ID := npx wbn-dump-id

# ==========================================
# TARGETS
# ==========================================

.PHONY: all clean build pack sign key bundle-id help

# Default target: clean, build, ensure key, pack, and sign
all: clean build key pack sign

# 1. Clean output directories
clean:
	@echo "Cleaning..."
	@rm -rf $(OUT_DIR)
	@mkdir -p $(OUT_DIR)

# 2. Build the application
build:
	@echo "Building source files..."
	@$(BUILD_CMD)
	@if [ ! -d "$(BUILD_DIR)" ]; then echo "Error: Directory $(BUILD_DIR) not found after build."; exit 1; fi

# 3. Generate private key if missing
key:
	@if [ ! -f $(KEY_FILE) ]; then \
		if [ "$(CI)" = "true" ]; then \
			echo "Error: Signing key $(KEY_FILE) is missing in CI."; \
			echo "Provide it before running make (for example from a GitHub Actions secret)."; \
			exit 1; \
		fi; \
		echo "Generating new Ed25519 private key..."; \
		openssl genpkey -algorithm Ed25519 -out $(KEY_FILE); \
		echo "Key generated: $(KEY_FILE)"; \
		echo "IMPORTANT: Keep this file safe!"; \
	else \
		echo "Using existing key: $(KEY_FILE)"; \
	fi

# 4. Create unsigned Web Bundle
pack:
	@echo "Creating unsigned Web Bundle..."
	@rm -f out.wbn $(UNSIGNED_BUNDLE)
	@if command -v gen-bundle >/dev/null 2>&1; then \
		gen-bundle -dir $(BUILD_DIR) -o $(UNSIGNED_BUNDLE); \
	else \
		npx --yes wbn --dir $(BUILD_DIR); \
		mv out.wbn $(UNSIGNED_BUNDLE); \
	fi

# 5. Sign the bundle
sign:
	@echo "Signing Web Bundle..."
	@if [ ! -f $(UNSIGNED_BUNDLE) ]; then echo "Error: Bundle $(UNSIGNED_BUNDLE) missing. Run 'make pack' first."; exit 1; fi
	@if [ ! -f $(KEY_FILE) ]; then echo "Error: Key $(KEY_FILE) missing."; exit 1; fi
	@$(WBN_SIGN) \
		-i $(UNSIGNED_BUNDLE) \
		-o $(SIGNED_BUNDLE) \
		-k $(KEY_FILE)
	@echo " "
	@echo "Success! Signed bundle generated:"
	@echo "   $(SIGNED_BUNDLE)"
	@echo " "
	@$(MAKE) bundle-id

bundle-id:
	@echo "Web Bundle ID:"
	@$(WBN_DUMP_ID) -k $(KEY_FILE)
	@echo "IWA Origin:"
	@$(WBN_DUMP_ID) -k $(KEY_FILE) -s

# Help
help:
	@echo "Usage:"
	@echo "  make           - Full build (clean -> build -> key -> pack -> sign)"
	@echo "  make pack      - Create unsigned bundle only"
	@echo "  make sign      - Sign existing bundle"
	@echo "  make key       - Generate private key if necessary"
	@echo "  make bundle-id - Print the Web Bundle ID and isolated-app origin"
