from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os

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
def extract_url(id: str = Query(..., description="YouTube video ID")):
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
            
            # Find the best audio format
            formats = info.get('formats', [])
            audio_formats = [
                f for f in formats 
                if f.get('acodec') != 'none' and f.get('vcodec') == 'none'
            ]
            
            # Sort by highest bitrate or just pick the best one provided by yt-dlp
            if not audio_formats:
                # Fallback to any format with audio if no audio-only is found
                audio_formats = [f for f in formats if f.get('acodec') != 'none']
            
            if not audio_formats:
                raise HTTPException(status_code=404, detail="No playable audio formats found")
            
            # Prefer m4a if available, otherwise take the first
            m4a_formats = [f for f in audio_formats if f.get('ext') == 'm4a']
            best_format = m4a_formats[0] if m4a_formats else audio_formats[-1]
            
            return {
                "url": best_format.get('url'),
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail')
            }
            
    except Exception as e:
        print(f"Extraction Error for {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Use environment variable PORT or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
