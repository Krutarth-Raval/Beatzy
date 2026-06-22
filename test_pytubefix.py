from pytubefix import YouTube

url = "https://www.youtube.com/watch?v=acfYQmCBsz8"
yt = YouTube(url, use_po_token=True)
print("Title:", yt.title)
try:
    ys = yt.streams.get_audio_only()
    print("URL:", ys.url)
except Exception as e:
    print("Error:", e)
