# "You Made Dinner!" — achievement pop-up video

A 30.5 s, 1920x1080 / 30 fps pixel-art video with a synthesised acid-jazz chiptune soundtrack.
It's in a Persona 5–inspired style: ransom-note text, shard wipes and cut-ins.

Output: `you_made_dinner.mp4`

## Rebuild

```bash
pip install numpy pillow scipy imageio-ffmpeg
./make.sh            # -> you_made_dinner.mp4 (about 1 min on 4 cores)
python3 render.py --still 20.5,23.1 /tmp   # preview single frames
```

Everything is procedural. There are no external assets, samples or fonts.

| file | purpose |
|---|---|
| `timeline.py` | single source of truth for every event time (120 BPM, 1 beat = 0.5 s) |
| `render.py` | scene logic and frame compositor (384x216 canvas, nearest-neighbour x5) |
| `background.py` | apartment: window skyline, dining nook, kitchen |
| `character.py` | pixel-puppet character (hand-drawn head/torso, jointed limbs) |
| `closeups.py` | pot, Shin Ramyun Black packet, cutting board, bowl, cut-in portrait |
| `ui.py` | ransom-note text, shard wipe, cut-in band, achievement box, stat-up, star iris |
| `audio.py` | drums / slap bass / FM e-piano / square lead / brass stabs + all SFX, mixed with reverb |
| `font.py` | 5x7 bitmap font |

## Beat sheet

| time | picture | sound |
|---|---|---|
| 0.0–2.0 | `SAT • EVENING` title card | stab + slam, letter ticks on 16ths, bass run-up |
| 2.0–4.0 | seated at the round table, thought bubble | groove A (Em9 / A13), stomach growl, pop |
| 4.0–6.5 | stands up, walks to the stove | chair scoot, footsteps on 8ths |
| 6.0–7.9 | cut-in: glasses glint, "LET'S COOK!" | glint shimmer, B7#9 stab, tom fill |
| 8.0–18.0 | cooking panel: boil, rip, drop, season, crack, stir, chop, pour, done | groove B + lead melody; knob, ignite, bubbles, rip, splash, shakers, crack, stir, ticks, chops, pour, ding |
| 18.0–20.0 | hop, present the bowl, rays build | boing, riser + snare roll |
| 20.0–22.5 | **ACHIEVEMENT UNLOCKED — YOU MADE DINNER!** | crash + stab, one arpeggio note per letter, shine chime |
| 22.5–24.0 | PROFICIENCY rank 1 → 2, "UP!" | rank-up chime on D6/9 |
| 24.0–28.6 | eating at the table, slurps, hearts, "SO GOOD!" cut-in | half-time outro, slurps, pops |
| 28.0–30.5 | final chord, star iris out | Gmaj9 arpeggio, final ding |
