const http = require('http');

const server = http.createServer((req, res) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/' || req.url === '/up')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
