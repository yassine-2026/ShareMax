const fs = require('fs');

const optimizerRoutes = `
app.post('/api/optimizer/upload', optimizerUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Analyze the file
    const info = await analyzeVideo(fs.createReadStream(req.file.path));
    const size = req.file.size;
    
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      info,
      size
    });
  } catch (err) {
    console.error('Optimizer upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload and analyze file' });
  }
});

app.post('/api/optimizer/process', async (req, res) => {
  try {
    const { fileId, platform } = req.body;
    
    if (!fileId || !platform) {
      return res.status(400).json({ error: 'Missing fileId or platform' });
    }
    
    const inputPath = path.join(os.tmpdir(), fileId);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Original file not found. Please upload again.' });
    }
    
    const jobId = 'job_' + Math.random().toString(36).substring(2, 15);
    exportJobs.set(jobId, { status: 'pending', progress: 0 });
    
    (async () => {
      let exportedFilePath = '';
      try {
        exportJobs.set(jobId, { status: 'processing', progress: 5 });
        const originalInfo = await analyzeVideo(fs.createReadStream(inputPath));
        const originalSize = fs.statSync(inputPath).size;
        
        if (checkIfOptimized(originalInfo, platform)) {
          exportJobs.set(jobId, { 
            status: 'completed', 
            progress: 100, 
            result: { 
              alreadyOptimized: true,
              originalInfo,
              originalSize,
              optimizedInfo: originalInfo,
              optimizedSize: originalSize,
              optimizedFileId: fileId // use original
            } 
          });
          return;
        }

        exportedFilePath = await exportVideo(
          fs.createReadStream(inputPath),
          platform,
          \`optimize_out_\${jobId}\`,
          (percent) => {
            const mappedProgress = Math.floor(5 + (percent * 0.9));
            const job = exportJobs.get(jobId);
            if (job && job.status === 'processing') {
              job.progress = mappedProgress;
            }
          }
        );

        exportJobs.set(jobId, { status: 'processing', progress: 95 });

        const optimizedInfo = await analyzeVideo(fs.createReadStream(exportedFilePath));
        const optimizedSize = fs.statSync(exportedFilePath).size;
        
        exportJobs.set(jobId, { 
          status: 'completed', 
          progress: 100, 
          result: {
            alreadyOptimized: false,
            originalInfo,
            originalSize,
            optimizedInfo,
            optimizedSize,
            optimizedFileId: path.basename(exportedFilePath)
          }
        });
        
      } catch (err) {
        console.error('Optimizer job error:', err);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = err.message || 'Unknown error occurred';
        }
      }
    })();
    
    res.json({ jobId });
  } catch (error) {
    console.error('Optimize start error:', error);
    res.status(500).json({ error: error.message || 'Failed to start optimization' });
  }
});

app.get('/api/optimizer/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const filePath = path.join(os.tmpdir(), fileId);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  res.download(filePath);
});
`;

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /\/\/ Vite middleware for development or serving static files in production/, 
  optimizerRoutes + '\n// Vite middleware for development or serving static files in production'
);

fs.writeFileSync('server.ts', code);
console.log('Successfully appended optimizer routes');
