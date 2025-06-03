@echo off
echo [*] Activating virtual environment and serving site...
call .venv\Scripts\activate.bat
mkdocs serve
