@echo off
TITLE BitChat - Yerel Sunucu (Local Server)
cls
echo [1/3] Donanim kontrol ediliyor...

:: Portu mesgul eden eski node sureclerini temizle
echo Eski bitisin temizleniyor...
taskkill /F /IM node.exe /T 2>nul
cls

echo.
echo    ____  _ _   _____ _           _ 
echo   ^|  _ \(_) ^|_/ ____^| ^|         ^| ^|
echo   ^| ^|_) ^|_^|  _^| ^|    ^| ^|__   __ _^| ^|_
echo   ^|  _ ^<^| ^| ^| ^| ^|    ^| '_ \ / _` ^| __^|
echo   ^| ^|_) ^| ^| ^|_^| ^|____^| ^| ^| ^| (_^| ^| ^|_ 
echo   ^|____/^|_^|\__^|\_____^|_^| ^|_^|\__,_^|\__^|
echo.
echo --------------------------------------------------
echo  Giris Bilgileri:
echo  1. Bilgisayarinizda: http://localhost:3000
echo  2. Ayni agdaki diger telefonlarda: http://%computername%:3000
echo --------------------------------------------------
echo.
echo [2/3] Bagimliliklar kontrol ediliyor...
if not exist "node_modules" (
    echo [! ] Moduller yukleniyor, lutfen bekleyin...
    call npm install
)

echo [3/3] BitChat Sunucusu CANLI!
echo.
node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Sunucu baslatilamadi. Lutfen Node.js'in yuklu oldugundan emin olun.
    pause
)
pause
