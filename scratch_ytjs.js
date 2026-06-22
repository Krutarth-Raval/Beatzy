const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    // Wait, ytjs actually has a VM fallback.
    // In node, ytjs tries to use JSDOM, and if it fails, it throws.
    // Wait, let's see if we can just get basic info without deciphering?
    // Let's try downloading with a client that doesn't need deciphering? Like ANDROID?
    
    const ytAndroid = await Innertube.create({
      clientType: 'ANDROID',
      generate_session_locally: true
    });
    
    const info = await ytAndroid.getBasicInfo('sBzrzS1Ag_g');
    const formats = info.streaming_data?.formats || [];
    const adaptive = info.streaming_data?.adaptive_formats || [];
    const allFormats = [...formats, ...adaptive].filter(f => f.has_audio);
    
    console.log(`Found ${allFormats.length} formats using ANDROID client`);
    if (allFormats.length > 0) {
      console.log(allFormats[0].url);
      console.log('Deciphering needed?', allFormats[0].decipher ? 'Yes' : 'No');
    }
  } catch (e) {
    console.error(e);
  }
}

testYtJs();
