#!/bin/sh

echo "[*] Detecting shell and activating virtual environment..."

# Determine the shell
SHELL_NAME=$(basename "$SHELL")

case "$SHELL_NAME" in
    fish)
        if [ -f ".venv/bin/activate.fish" ]; then
            echo "[*] Detected Fish shell"
            echo "[*] Activating virtual environment and serving site..."
            exec fish -c "source .venv/bin/activate.fish; mkdocs serve"
        else
            echo "[!] activate.fish not found in .venv/bin/"
            exit 1
        fi
        ;;
    zsh|bash|sh)
        if [ -f ".venv/bin/activate" ]; then
            echo "[*] Detected $SHELL_NAME shell"
            echo "[*] Activating virtual environment and serving site..."
            . .venv/bin/activate
            mkdocs serve
        else
            echo "[!] activate not found in .venv/bin/"
            exit 1
        fi
        ;;
    *)
        echo "[!] Unsupported shell: $SHELL_NAME"
        exit 1
        ;;
esac
