const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    const info = await yt.getBasicInfo('sBzrzS1Ag_g'); // Tame Impala
    
    // Attempt to get the best audio format
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    console.log(`Found format:`, format ? 'Yes' : 'No');
    if (format) {
      if (format.decipher) {
        format.url = format.decipher(yt.session.player);
      }
      console.log('Format URL:', format.url);
    }
  } catch (e) {
    if (e.message.includes('No valid URL to decipher')) {
      console.log('Caught decipher error, trying to just use format.url');
    } else {
      console.error(e);
    }
  }
}

testYtJs();
