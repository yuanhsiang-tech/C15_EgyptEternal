@echo off
REM Sort input_resources.json cache sections
REM Usage: run_sort.bat [input_file] [output_file]
REM 
REM Examples:
REM   run_sort.bat input_resources.json sorted_input_resources.json
REM   run_sort.bat generated_input_resources.json
REM   run_sort.bat (will sort both files with default names)

setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if "%1"=="" (
    echo Sorting both input_resources.json files with default names...
    echo.
    
    REM Sort original input_resources.json
    if exist "input_resources.json" (
        echo Sorting input_resources.json...
        python sort_input_resources.py input_resources.json sorted_input_resources.json
        echo.
    ) else (
        echo Warning: input_resources.json not found
        echo.
    )
    
    REM Sort generated input_resources.json
    if exist "generated_input_resources.json" (
        echo Sorting generated_input_resources.json...
        python sort_input_resources.py generated_input_resources.json sorted_generated_input_resources.json
        echo.
    ) else (
        echo Warning: generated_input_resources.json not found
        echo.
    )
    
    echo Done! Check sorted_*.json files
    pause
    exit /b 0
)

set "INPUT_FILE=%1"
set "OUTPUT_FILE=%2"

echo Sorting input_resources.json cache sections...
echo Input file: %INPUT_FILE%

if "%OUTPUT_FILE%"=="" (
    echo Output file: Will be auto-generated with 'sorted_' prefix
) else (
    echo Output file: %OUTPUT_FILE%
)
echo.

python sort_input_resources.py "%INPUT_FILE%" "%OUTPUT_FILE%"

if errorlevel 1 (
    echo.
    echo Error: Script failed to execute!
    pause
    exit /b 1
)

echo.
echo Done!
pause
