@echo off
echo ======================================
echo Building CSD2Prefab.exe from doit.py
echo ======================================

echo Step 1: Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Step 2: Building executable with PyInstaller...
pyinstaller --onefile --name=CSD2Prefab --add-data="file_id_pool.json;." --add-data="material_config.json;." --add-data="easing_map.py;." doit.py

echo.
echo Step 3: Backing up old executable...
if exist CSD2Prefab.exe (
    copy CSD2Prefab.exe CSD2Prefab_backup.exe
    echo Old CSD2Prefab.exe backed up as CSD2Prefab_backup.exe
)

echo.
echo Step 4: Copying new executable...
copy dist\CSD2Prefab.exe CSD2Prefab.exe

echo.
echo Step 5: Testing the new executable...
.\CSD2Prefab.exe --version

echo.
echo Step 6: Cleaning up build files...
rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul
del CSD2Prefab.spec 2>nul

echo.
echo ======================================
echo Build completed successfully!
echo New CSD2Prefab.exe is ready to use.
echo ======================================
pause
