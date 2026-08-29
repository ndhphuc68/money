// Reverse proxy in front of the Expo/Metro web dev server that adds the
// Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers Metro
// itself does not apply to every response (see docs/research/expo-sqlite-web-coop-coep.md).
// expo-sqlite on web needs these to unlock SharedArrayBuffer.
//
// Usage: node scripts/web-dev-proxy.js [proxyPort] [targetPort]
const http = require('http');

const proxyPort = Number(process.argv[2]) || 8090;
const targetPort = Number(process.argv[3]) || 8081;

function copyHeaders(res, upstreamRes) {
  for (const [key, value] of Object.entries(upstreamRes.headers)) {
    res.setHeader(key, value);
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
}

const server = http.createServer((req, res) => {
  const upstreamReq = http.request(
    { host: 'localhost', port: targetPort, path: req.url, method: req.method, headers: req.headers },
    (upstreamRes) => {
      copyHeaders(res, upstreamRes);
      res.writeHead(upstreamRes.statusCode);
      upstreamRes.pipe(res);
    },
  );
  upstreamReq.on('error', (err) => {
    res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  });
  req.pipe(upstreamReq);
});

server.on('upgrade', (req, clientSocket, head) => {
  const upstreamReq = http.request({
    host: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });
  upstreamReq.end();
  upstreamReq.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    clientSocket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(upstreamRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n',
    );
    upstreamSocket.write(upstreamHead);
    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });
});

server.listen(proxyPort, () => {
  console.log(`Web dev proxy listening on http://localhost:${proxyPort} -> http://localhost:${targetPort}`);
});
