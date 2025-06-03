@echo off
echo [*] Creating virtual environment...
python -m venv .venv

echo [*] Activating virtual environment and upgrading pip...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip

echo [*] Installing MkDocs and required plugins...
python -m pip install mkdocs-material mkdocs-roamlinks-plugin mkdocs-blog-plugin mkdocs-rss-plugin pymdown-extensions mkdocs-rss-plugin mkdocs-awesome-pages-plugin mkdocs-exclude


echo [✓] Setup complete. To start working, run start_venv.bat
pause
