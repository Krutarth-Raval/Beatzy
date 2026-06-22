async function testCobalt() {
  const instances = [
    'https://cobalt.api.kwiatekm.dev/api/json',
    'https://cobalt.qwyzex.com/api/json',
    'https://co.hostux.net/api/json',
    'https://cobalt.casiocraft.cc/api/json'
  ];

  for (const instance of instances) {
    try {
      console.log('Testing', instance);
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isAudioOnly: true
        }),
        timeout: 5000
      });
      
      const data = await res.json();
      if (data && data.status === 'stream' && data.url) {
        console.log(`Success! Found URL on ${instance}`);
        return;
      }
      if (data && data.url) {
        console.log(`Success! Found direct URL on ${instance}`);
        return;
      }
    } catch (e) {
      console.error('Error on', instance, e.message);
    }
  }
}
testCobalt();
