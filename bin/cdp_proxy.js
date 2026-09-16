const http = require('http');
const net = require('net');

function startCdpProxy(targetPort = 7907, listenPort = 8314) {
  const server = http.createServer((req, res) => {
    const opt = {
      host: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:' + targetPort }
    };
    const proxyReq = http.request(opt, (proxyRes) => {
      let data = [];
      proxyRes.on('data', chunk => data.push(chunk));
      proxyRes.on('end', () => {
        let buf = Buffer.concat(data);
        const ct = proxyRes.headers['content-type'] || '';
        if (ct.includes('application/json') || req.url.includes('/json')) {
          let text = buf.toString('utf8');
          text = text.replace(new RegExp('127\\\\.0\\\\.0\\\\.1:' + targetPort, 'g'), '127.0.0.1:' + listenPort);
          buf = Buffer.from(text);
          proxyRes.headers['content-length'] = buf.length;
        }
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(buf);
      });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end('CDP Proxy Error: ' + err.message);
    });
    req.pipe(proxyReq);
  });

  server.on('upgrade', (req, socket, head) => {
    const proxySocket = net.connect(targetPort, '127.0.0.1', () => {
      let rawReq = req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n';
      for (const [key, value] of Object.entries(req.headers)) {
        if (key.lowerCase() === 'host') {
          rawReq += 'Host: 127.0.0.1:' + targetPort + '\r\n';
        } else {
          rawReq += key + ': ' + value + '\r\n';
        }
      }
      rawReq += '\r\n';
      proxySocket.write(rawReq);
      if (head && head.length) proxySocket.write(head);
      socket.pipe(proxySocket);
      proxySocket.pipe(socket);
    });
    proxySocket.on('error', () => { socket.destroy(); });
    socket.on('error', () => { proxySocket.destroy(); });
  });

  server.listen(listenPort, '127.0.0.1', () => {
    console.log('CDP Proxy listening on http://127.0.0.1:' + listenPort + ' -> ' + targetPort);
  });
  return server;
}

if (require.main === module) {
  startCdpProxy();
}

module.exports = { startCdpProxy };