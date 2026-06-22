const play = require('play-dl');

async function test() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=sBzrzS1Ag_g');
    const formats = info.format;
    const audioFormats = formats.filter(f => f.hasAudio);
    console.log(`Found ${audioFormats.length} audio formats`);
    if (audioFormats.length > 0) {
      console.log('First format URL:', audioFormats[0].url);
    }
  } catch (e) {
    console.error(e);
  }
}
test();
