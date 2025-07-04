#!/bin/sh

echo "[*] Creating virtual environment..."
python3 -m venv .venv

echo "[*] Activating virtual environment and upgrading pip..."
# POSIX-compatible shell; use bash/zsh/fish manually if needed
# This script does not stay in the venv; it runs pip commands within it

# Source venv if available
if [ -f ".venv/bin/activate" ]; then
    . .venv/bin/activate
else
    echo "[!] Failed to find .venv/bin/activate"
    exit 1
fi

python -m pip install --upgrade pip

echo "[*] Installing MkDocs and required plugins..."
python -m pip install \
    mkdocs-material \
    mkdocs-roamlinks-plugin \
    mkdocs-blog-plugin \
    mkdocs-rss-plugin \
    pymdown-extensions \
    mkdocs-awesome-pages-plugin \
    mkdocs-exclude

echo "[✓] Setup complete."
echo "To activate the venv, run:"
echo ""
echo "  source .venv/bin/activate    # for bash/zsh"
echo "  source .venv/bin/activate.fish  # for fish, if available"
