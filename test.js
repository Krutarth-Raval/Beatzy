const fetch = require('node-fetch');
fetch('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M')
  .then(r => r.text())
  .then(t => {
    const split1 = t.split('<script id="__NEXT_DATA__" type="application/json">')[1];
    if (!split1) return console.log("NO NEXT DATA");
    const m = split1.split('</script>')[0];
    const data = JSON.parse(m);
    console.log(data.props.pageProps.state.data.entity.trackList[0]);
  })
  .catch(console.error);
