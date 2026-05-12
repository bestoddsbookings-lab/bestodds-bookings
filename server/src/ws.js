const WebSocket = require('ws');
const url = require('url');

let wss;

function init(server) {
  if (wss) return wss;
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);
    console.log('ws connection', { path: location.pathname });
    ws.on('message', (msg) => {
      // noop for now; clients can send handshake if needed
      // console.log('ws message', msg.toString());
    });
  });

  console.log('WebSocket server initialized on /ws');
  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const text = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(text);
    }
  });
}

module.exports = { init, broadcast };
