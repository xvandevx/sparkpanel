# dev-stop

Погасить локальный стек aiAdmin (dev-серверы + контейнеры).

## Действия

1. Из `webSite/`:
   ```bash
   chmod +x scripts/stop.sh && ./scripts/stop.sh
   ```
2. Проверь, что порты освободились:
   ```bash
   lsof -nP -iTCP:3401 -sTCP:LISTEN; lsof -nP -iTCP:3402 -sTCP:LISTEN; lsof -nP -iTCP:3400 -sTCP:LISTEN
   ```

## Почему не `pkill`

`pkill -f "nest start"` убивает только обёртку — дочерний node продолжает держать :3402
и отвечать **старым кодом**. Гасить надо по порту (`lsof -ti:3402 | xargs kill -9`),
это уже делает `stop.sh`.
