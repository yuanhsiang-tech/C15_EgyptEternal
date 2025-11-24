@echo off
REM Reverse generate input_resources.json from Unity asset folder
REM Usage: run_reverse_generate.bat [input_folder] [output_file]
REM 
REM Example:
REM   run_reverse_generate.bat ../Ref/AIO_OLD_RES generated_input_resources.json
REM   run_reverse_generate.bat C:\MyAssets\Unity_Assets

setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM if "%1"=="" (
REM     echo Usage: run_reverse_generate.bat ^<input_folder^> [output_file]
REM     echo.
REM     echo Example:
REM     echo   run_reverse_generate.bat ../Ref/AIO_OLD_RES generated_input_resources.json
REM     echo   run_reverse_generate.bat C:\MyAssets\Unity_Assets
REM     echo.
REM     pause
REM     exit /b 1
REM )

set INPUT_FOLDER=..\Ref\AIO_OLD_RES
set OUTPUT_FILE=generated_input_resources.json

echo Reverse generating input_resources.json...
echo Input folder: %INPUT_FOLDER%
echo Output file: %OUTPUT_FILE%
echo.

python reverse_generate_input_resources.py "%INPUT_FOLDER%" "%OUTPUT_FILE%"

if errorlevel 1 (
    echo.
    echo Error: Script failed to execute!
    pause
    exit /b 1
)

echo.
echo Done! Generated file: %OUTPUT_FILE%
pause
