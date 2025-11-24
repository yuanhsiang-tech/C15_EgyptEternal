@echo off
chcp 65001 >nul
echo ========================================
echo "CSD => PREFAB 轉換器"
echo ========================================
echo.


echo 正在清空 output 資料夾...
if exist ".\output" (
    rmdir /s /q ".\output"
    echo ✅ output 資料夾已清空
) else (
    echo ℹ️  output 資料夾不存在，將自動創建
)
mkdir ".\output"

echo 正在執行 CSD 到 PREFAB 的轉換...
echo.

cd tools
python doit.py

echo.
echo 轉換完成！請查看 output 資料夾中的結果。
echo.
pause 