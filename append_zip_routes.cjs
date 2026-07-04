const fs = require('fs');

const zipRoutes = `
const archiver = require('archiver');
const zipJobs = new Map();

app.post('/api/optimizer/prepare-zip', (req, res) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Invalid files array' });
  }
  
  const zipId = 'zip_' + Math.random().toString(36).substring(2, 15);
  zipJobs.set(zipId, files);
  
  res.json({ zipId });
});

app.get('/api/optimizer/download-zip/:zipId', (req, res) => {
  const zipId = req.params.zipId;
  const files = zipJobs.get(zipId);
  
  if (!files) {
    return res.status(404).send('ZIP job not found or expired');
  }
  
  res.attachment('optimized_videos.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });
  
  archive.on('error', function(err) {
    res.status(500).send({error: err.message});
  });
  
  archive.pipe(res);
  
  for (const file of files) {
    const filePath = path.join(os.tmpdir(), file.fileId);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.name });
    }
  }
  
  archive.finalize();
  
  // Optionally remove the job from memory after some time or immediately
  // zipJobs.delete(zipId); 
});
`;

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /\/\/ Vite middleware for development or serving static files in production/, 
  zipRoutes + '\n// Vite middleware for development or serving static files in production'
);

// We need to import archiver, but we can just use require inside the route or add import at top.
// Since it's ES module, we should add import at top.
code = "import archiver from 'archiver';\n" + code;

fs.writeFileSync('server.ts', code);
console.log('Successfully appended ZIP routes');
