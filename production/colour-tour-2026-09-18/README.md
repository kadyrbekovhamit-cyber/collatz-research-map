# Reproducing the colour tour

The adjacent HTML tour is served from `/tour/`. This production folder preserves the English script, synthetic narration, real word-boundary events, data and single-worker renderer. No network requests are required to render using the supplied audio.

Requirements: Python 3.9+, Pillow, FFmpeg/FFprobe. The renderer currently uses macOS Arial font paths; adjust FONT/BOLD for your platform. To regenerate narration, install edge-tts and run `python narrate.py` (the narration text is sent to Microsoft Edge TTS). Reuse the existing audio when unchanged.

Run `python render.py --stills` to inspect keyframes, then `python render.py` to render the complete video. Output goes to this production folder's `tour/`; serving `/tour/` at the repository root displays the published version.

Voice: en-US-JennyNeural; rate -3%; pitch unchanged. Subtitles derive from actual TTS word timings. No audio playback was used during production. Graph snapshot: 16 September 2026; presentation: 18 September 2026. See sources.md for claim boundaries and author attribution.
