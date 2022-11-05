const http = require('http');

function extractUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let loginLink = ''
  text.replace(urlRegex, function(url) {
    loginLink = url;
  });
  return loginLink;
}

let token = null;
let lastSetAt = Date.now();

//create a server object:
http.createServer(function(req, res) {
  if (req.method === 'POST') {
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      const x = new URLSearchParams(body);

      token = extractUrl(x.get('text'));
      lastSetAt = Date.now();
      console.log('URL', token)
      res.end(token)
    });
  } else {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(
      JSON.stringify({
        url: Date.now() - lastSetAt > 10000 ? null : token
      })
    );
  }
}).listen(8080);
