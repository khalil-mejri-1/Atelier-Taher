@echo off
chcp 65001 > nul
title Atelier Taher - Launcher
echo ===================================================
echo    🚀 Atelier Taher - تشغيل النظام بالكامل
echo ===================================================
echo [1/2] جاري تشغيل سيرفر الباك إند (Port 5000)...
start "Atelier Taher Server" cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak > nul
echo [2/2] جاري تشغيل الواجهة الأمامية (Vite)...
cd client && npm run dev

