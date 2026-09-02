#!/bin/bash

pkill -f "/home/living/signage-test/server.py" 2>/dev/null || true
nohup /usr/bin/python3 /home/living/signage-test/server.py \
  >> /home/living/signage-test/server.log 2>&1 &

sleep 2

killall chromium 2>/dev/null || true
sleep 2

chromium \
  --app="http://10.201.52.70:4173/?view=signage" \
  --window-position=0,0 \
  --window-size=5760,1080 \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --no-first-run \
  --disable-gpu &

sleep 3

wmctrl -r :ACTIVE: -b remove,maximized_vert,maximized_horz
wmctrl -r :ACTIVE: -e 0,0,0,5760,1080

ACTIVE_WINDOW=$(xprop -root 32x '\t$0' _NET_ACTIVE_WINDOW | cut -f 2)
xprop -id "$ACTIVE_WINDOW" -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "2, 0, 0, 0, 0"
