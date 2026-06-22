async function testInvidious() {
  const instances = [
    'https://vid.puffyan.us',
    'https://inv.tux.pizza',
    'https://invidious.asir.dev',
    'https://invidious.projectsegfau.lt'
  ];

  for (const instance of instances) {
    try {
      console.log('Testing', instance);
      const res = await fetch(`${instance}/api/v1/videos/dQw4w9WgXcQ`);
      if (!res.ok) {
        console.log('Failed', res.status);
        continue;
      }
      const data = await res.json();
      if (data && data.adaptiveFormats) {
        const audio = data.adaptiveFormats.filter(f => f.type.startsWith('audio'));
        console.log(`Found ${audio.length} audio streams on ${instance}`);
        if (audio.length > 0) {
          console.log(audio[0].url);
        }
      } else {
        console.log('No formats');
      }
    } catch (e) {
      console.error('Error on', instance, e.message);
    }
  }
}
testInvidious();
