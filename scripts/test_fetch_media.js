const http = require('http');

const req = http.request('http://127.0.0.1:8315/input_wallpaper.mp4', {
  method: 'GET',
  headers: {
    'Range': 'bytes=0-1024'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let bytes = 0;
  res.on('data', chunk => bytes += chunk.length);
  res.on('end', () => console.log('Read bytes:', bytes));
});
req.on('error', (e) => console.log('Error:', e.message));
req.end();
