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
async def extract_url(id: str = Query(..., description="YouTube video ID"), q: str = Query(None, description="Search Query")):
    """
    Extracts the direct streaming URL for a given YouTube video ID.
    Returns the best available audio-only format (usually m4a or webm).
    """
    import re
    
    # ==========================================
    # EMPIRE OF PROTECTION LAYER 1: Soundcloud (Fastest, No Bot Blocks)
    # ==========================================
    if q:
        # Clean query to remove weird characters like | [] () that break Soundcloud search
        clean_q = re.sub(r'[^\w\s]', ' ', q)
        clean_q = ' '.join(clean_q.split())
        
        print(f"Attempting Soundcloud for query: {clean_q}")
        try:
            with yt_dlp.YoutubeDL({'format': 'bestaudio/best', 'quiet': True}) as ydl:
                info = ydl.extract_info(f"scsearch1:{clean_q}", download=False)
                if 'entries' in info and len(info['entries']) > 0:
                    entry = info['entries'][0]
                    return {
                        "url": entry.get('url'),
                        "title": entry.get('title'),
                        "thumbnail": entry.get('thumbnail')
                    }
        except Exception as ex:
            print(f"Soundcloud fallback failed: {ex}")
            
    # ==========================================
    # EMPIRE OF PROTECTION LAYER 2: yt-dlp (Direct YouTube)
    # ==========================================
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'extract_flat': False,
        'simulate': True,
        'youtube_include_dash_manifest': False,
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
        print(f"yt-dlp Extraction Failed for {id}: {str(e)}.")
        

        
    # ==========================================
    # EMPIRE OF PROTECTION LAYER 3: Piped API Fallback
    # ==========================================
    piped_instances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.syncpundit.io",
        "https://piped-api.garudalinux.org"
    ]
    
    async with httpx.AsyncClient(timeout=3.0) as client:
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
    # EMPIRE OF PROTECTION LAYER 4: Cobalt API Fallback
    # ==========================================
    cobalt_instances = [
        "https://co.wuk.sh",
        "https://cobalt.qwyre.com",
        "https://api.cobalt.tools",
        "https://api.cobalt.lol"
    ]
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": f"https://www.youtube.com/watch?v={id}",
        "isAudioOnly": True,
        "aFormat": "mp3"
    }
    
    async with httpx.AsyncClient(timeout=3.0) as client:
        for instance in cobalt_instances:
            try:
                res = await client.post(f"{instance}/api/json", json=payload, headers=headers)
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
