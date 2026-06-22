from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
import httpx
import asyncio

app = FastAPI(title="Beatzy Extraction API")

# Add CORS so the Next.js frontend can call this backend directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for easy deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Beatzy Extraction Backend is running"}

@app.get("/api/extract-url")
async def extract_url(id: str = Query(..., description="YouTube video ID")):
    """
    Extracts the direct streaming URL for a given YouTube video ID.
    Returns the best available audio-only format (usually m4a or webm).
    """
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'extract_flat': False,
        'simulate': True,
        'youtube_include_dash_manifest': False,
        # Empire of Protection: Bypass YouTube's Bot Detection by spoofing mobile clients
        'extractor_args': {
            'youtube': {'player_client': ['android', 'ios']}
        }
    }

    try:
        url = f"https://www.youtube.com/watch?v={id}"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = info.get('formats', [])
            audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
            if not audio_formats:
                audio_formats = [f for f in formats if f.get('acodec') != 'none']
            
            if audio_formats:
                m4a_formats = [f for f in audio_formats if f.get('ext') == 'm4a']
                best_format = m4a_formats[0] if m4a_formats else audio_formats[-1]
                return {
                    "url": best_format.get('url'),
                    "title": info.get('title'),
                    "thumbnail": info.get('thumbnail')
                }
            
    except Exception as e:
        print(f"yt-dlp Extraction Failed for {id}: {str(e)}. Falling back to Piped API Protection...")
        
    # ==========================================
    # EMPIRE OF PROTECTION: Piped API Fallback
    # ==========================================
    piped_instances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.syncpundit.io",
        "https://piped-api.garudalinux.org"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for instance in piped_instances:
            try:
                res = await client.get(f"{instance}/streams/{id}")
                if res.status_code == 200:
                    data = res.json()
                    audio_streams = data.get("audioStreams", [])
                    if audio_streams:
                        m4a_streams = [s for s in audio_streams if s.get("mimeType") == "audio/mp4" or s.get("format") == "M4A"]
                        if m4a_streams:
                            m4a_streams.sort(key=lambda x: x.get("bitrate", 0), reverse=True)
                            best_url = m4a_streams[0]["url"]
                        else:
                            best_url = audio_streams[0]["url"]
                            
                        return {
                            "url": best_url,
                            "title": data.get("title", "Audio"),
                            "thumbnail": data.get("thumbnailUrl")
                        }
            except Exception as ex:
                print(f"Piped instance {instance} failed: {ex}")
                continue
                
        # ==========================================
        # EMPIRE OF PROTECTION LAYER 3: Cobalt API
        # ==========================================
        cobalt_instances = [
            "https://api.cobalt.tools",
            "https://co.wuk.sh",
            "https://cobalt.qwyre.com"
        ]
        
        for instance in cobalt_instances:
            try:
                headers = {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
                }
                payload = {
                    "url": f"https://www.youtube.com/watch?v={id}",
                    "isAudioOnly": True
                }
                res = await client.post(instance, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") in ["stream", "redirect", "success"] and data.get("url"):
                        return {
                            "url": data.get("url"),
                            "title": "Audio Stream",
                            "thumbnail": None
                        }
            except Exception as ex:
                print(f"Cobalt instance {instance} failed: {ex}")
                continue

    raise HTTPException(status_code=500, detail="All extraction methods and fallback protections failed.")

if __name__ == "__main__":
    import uvicorn
    # Use environment variable PORT or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
