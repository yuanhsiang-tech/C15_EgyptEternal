@echo off
chcp 65001 >nul
echo ========================================
echo CSD Tree Viewer - 自動處理工具
echo ========================================
echo.

echo 正在處理 input 資料夾中的所有 CSD 檔案...
echo.

python csd_tree_viewer.py --batch

echo.
echo 處理完成！請查看 output_csd_tree 資料夾中的結果。
echo.
pause 