const { Innertube, UniversalCache } = require('youtubei.js');

async function testYtJs() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
    const info = await yt.getBasicInfo('sBzrzS1Ag_g'); // Tame Impala
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    console.log(format);
  } catch (e) {
    console.error(e);
  }
}

testYtJs();
