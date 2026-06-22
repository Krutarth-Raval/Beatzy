const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    const info = await yt.getBasicInfo('sBzrzS1Ag_g'); // Tame Impala - New Person, Same Old Mistakes
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    if (format) {
      if (format.url) {
        console.log('Got URL immediately:', format.url);
      } else if (format.signature_cipher) {
        console.log('Needs deciphering');
        const url = format.decipher(yt.session.player);
        console.log('Deciphered URL:', url);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

testYtJs();
