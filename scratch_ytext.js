const yt = require('youtube-ext');

async function testYtExt() {
  try {
    const info = await yt.videoInfo('sBzrzS1Ag_g'); // Tame Impala
    const formats = info.streamingData?.adaptiveFormats || [];
    const audioFormats = formats.filter(f => f.mimeType.includes('audio'));
    console.log(`Found ${audioFormats.length} audio formats`);
    if (audioFormats.length > 0) {
      console.log('First format URL:', audioFormats[0].url);
    }
  } catch (e) {
    console.error(e);
  }
}
testYtExt();
