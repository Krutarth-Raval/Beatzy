async function testPiped() {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.smnz.de',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.astartes.nl',
    'https://pipedapi.drgns.space'
  ];

  for (const instance of instances) {
    try {
      console.log('Testing', instance);
      const res = await fetch(`${instance}/streams/dQw4w9WgXcQ`, { timeout: 5000 });
      if (!res.ok) {
        console.log('Failed', res.status);
        continue;
      }
      const data = await res.json();
      if (data && data.audioStreams && data.audioStreams.length > 0) {
        console.log(`Success! Found ${data.audioStreams.length} audio streams on ${instance}`);
        return;
      }
    } catch (e) {
      console.error('Error on', instance, e.message);
    }
  }
}
testPiped();
