echo "export const MANIA_MODE = $1" > src/gamemode.ts
if [[ "$1" = "true" ]]; then
  echo Mania Mode
  cp src/assets/logo-mania.png src/assets/logo.png
else
  echo Normal Mode
  cp src/assets/logo-normal.png src/assets/logo.png
fi
