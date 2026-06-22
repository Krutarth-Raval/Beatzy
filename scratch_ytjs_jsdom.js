const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    const info = await yt.getBasicInfo('sBzrzS1Ag_g'); // Tame Impala - New Person, Same Old Mistakes
    
    // Attempt to get the best audio format
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    console.log(`Found format:`, format ? 'Yes' : 'No');
    if (format) {
      console.log('Format URL:', format.decipher(yt.session.player));
    }
  } catch (e) {
    console.error(e);
  }
}

testYtJs();
