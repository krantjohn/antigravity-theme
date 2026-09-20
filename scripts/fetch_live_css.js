const http = require('http');

http.get('http://127.0.0.1:8315/custom_theme.css', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Length:', body.length);
    const m = body.match(/agentSidePanelInputBox[^}]+}/s);
    if (m) {
      console.log('Found rule:', m[0].substring(0, 300));
    } else {
      console.log('Rule not found in body');
    }
  });
});
