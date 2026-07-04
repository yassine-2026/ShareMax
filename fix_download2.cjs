const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /res\.sendFile\(filePath\);/,
  `if (req.query.download) {
    res.download(filePath, \`optimized_\${fileId}\`);
  } else {
    res.sendFile(filePath);
  }`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed download endpoint to support both preview and download');
