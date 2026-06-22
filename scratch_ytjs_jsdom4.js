const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    const info = await yt.getBasicInfo('sBzrzS1Ag_g'); // Tame Impala
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    console.log(`Found format:`, format ? 'Yes' : 'No');
    if (format) {
      if (format.url) {
        console.log('Format URL:', format.url);
      } else {
        const url = await format.decipher(yt.session.player);
        console.log('Deciphered URL:', url);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

testYtJs();
