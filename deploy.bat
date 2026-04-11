@echo off
echo Aanpassingen uploaden naar GitHub...

set /p bericht="Omschrijving van de aanpassing: "

git add .
git commit -m "%bericht%"
git push

echo.
echo Klaar! Vercel deployt nu automatisch.
pause
