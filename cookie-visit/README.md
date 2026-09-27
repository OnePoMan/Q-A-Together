# 엄마표 쿠키 — Mom's Homemade Cookies

A 34.5 s, 1920x1080 / 30 fps vector-cartoon short with a synthesised soundtrack.
A Korean mother-in-law visits her son and daughter-in-law (both in glasses) with homemade cookies
wrapped in a bojagi. They eat the cookies and exclaim how delicious they are.

Output: `cookie_visit.mp4`

## Rebuild

```bash
pip install numpy scipy pycairo imageio-ffmpeg
./make.sh                                   # -> cookie_visit.mp4 (about 1.5 min on 4 cores)
python3 render.py --still 19.9,25.3 /tmp    # preview single frames
```

All art and audio are procedural. The only asset is the Jua font (`fonts/`, SIL Open Font License).

| file | purpose |
|---|---|
| `timeline.py` | event times + dialogue lines (100 BPM, 1 beat = 0.6 s) |
| `render.py` | scene logic, camera, transitions, frame encoder |
| `rig.py` | character rig: son, daughter-in-law, mother-in-law |
| `scenes.py` | hallway, living room, bojagi, cookie tin, bubbles, effects |
| `audio.py` | gayageum-style Karplus-Strong melody, FM keys, upright bass, brushes, strings, babble voices, SFX |
| `vg.py` | cairo drawing helpers + easing |

## Beat sheet

| time | picture | sound |
|---|---|---|
| 0.0–4.8 | 일요일 오후: Mom walks the hallway to 302호, rings the bell, door unlocks | gayageum intro, footsteps, ding-dong, 띠리릭 door-lock chime |
| 4.8–9.6 | "엄마!" / "어머니, 어서 오세요!" (bow) / "아이고~ 우리 애기들!" | groove enters, babble voices |
| 9.6–14.4 | at the table: bojagi untied, tin lid pops, "우와~!", "엄마가 직접 구웠지~" | cloth rustles, lid pop, glockenspiel reveal |
| 14.4–19.2 | close-up: grab, **바삭!** bite, 냠냠 chewing, music stops, "!", glasses glint | crunch, munching, silence, pops, shimmer |
| 19.2–24.0 | **맛있어요!! SO DELICIOUS!!** burst, "엄마 최고!", "진짜 맛있어요, 어머니!" | full band + strings, shout |
| 24.0–31.2 | Mom beams (hearts): "많이 먹어~ 더 있어!", second cookies, everyone laughs | warm outro groove |
| 31.2–34.5 | end card: 엄마표 쿠키 · Homemade with love | gayageum glissando, final chord |
