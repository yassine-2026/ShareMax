const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const exportRouteRegex = /app\.get\('\/api\/video\/:id\/export'[\s\S]*?\}\);/m;

const newOptimizeLogic = `const exportJobs = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'error',
  progress: number,
  result?: any,
  error?: string
}>();

app.post('/api/video/:id/optimize', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    
    if (!platform || !['tiktok', 'instagram', 'youtube_shorts', 'facebook', 'whatsapp', 'telegram', 'low_size', 'original'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const jobId = Math.random().toString(36).substring(2, 15);
    exportJobs.set(jobId, { status: 'pending', progress: 0 });

    // Start async processing
    (async () => {
      let tmpInputPath = '';
      let exportedFilePath = '';
      try {
        exportJobs.set(jobId, { status: 'processing', progress: 5 });
        
        const fileMeta = await drive.files.get({ fileId: id, fields: 'name' });
        const originalName = fileMeta.data.name || 'video.mp4';
        
        tmpInputPath = path.join(os.tmpdir(), \`optimize_in_\${id}_\${Date.now()}\`);
        const streamRes = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });
        const dest = fs.createWriteStream(tmpInputPath);
        
        await new Promise((resolve, reject) => {
          streamRes.data.pipe(dest);
          dest.on('finish', resolve);
          dest.on('error', reject);
        });

        exportJobs.set(jobId, { status: 'processing', progress: 15 });

        // Optional: check if already optimized
        const info = await analyzeVideo(fs.createReadStream(tmpInputPath));
        const originalSize = fs.statSync(tmpInputPath).size;

        if (platform !== 'original' && checkIfOptimized(info, platform)) {
          exportJobs.set(jobId, { 
            status: 'completed', 
            progress: 100, 
            result: { 
              alreadyOptimized: true,
              originalInfo: info,
              originalSize,
              optimizedInfo: info,
              optimizedSize: originalSize,
              driveId: id
            } 
          });
          fs.unlink(tmpInputPath, () => {});
          return;
        }

        exportedFilePath = await exportVideo(
          fs.createReadStream(tmpInputPath),
          platform as any,
          \`optimize_out_\${id}_\${Date.now()}\`,
          (percent) => {
            // Map 0-100 to 15-85
            const mappedProgress = Math.floor(15 + (percent * 0.7));
            const job = exportJobs.get(jobId);
            if (job && job.status === 'processing') {
              job.progress = mappedProgress;
            }
          }
        );

        exportJobs.set(jobId, { status: 'processing', progress: 85 });

        // Upload back to Drive
        const optimizedInfo = await analyzeVideo(fs.createReadStream(exportedFilePath));
        const optimizedSize = fs.statSync(exportedFilePath).size;

        const media = {
          mimeType: 'video/mp4',
          body: fs.createReadStream(exportedFilePath),
        };
        const uploadRes = await drive.files.create({
          requestBody: {
            name: \`\${platform}_optimized_\${originalName}\`,
            parents: ['root'], // Could be a specific folder
          },
          media: media,
          fields: 'id, webViewLink',
        });
        
        exportJobs.set(jobId, { status: 'processing', progress: 95 });

        // Make it publicly accessible
        await drive.permissions.create({
          fileId: uploadRes.data.id!,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        exportJobs.set(jobId, { 
          status: 'completed', 
          progress: 100, 
          result: {
            alreadyOptimized: false,
            originalInfo: info,
            originalSize,
            optimizedInfo: optimizedInfo,
            optimizedSize: optimizedSize,
            driveId: uploadRes.data.id,
            webViewLink: uploadRes.data.webViewLink
          }
        });

      } catch (err: any) {
        console.error('Job error:', err);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = err.message || 'Unknown error occurred';
        }
      } finally {
        if (tmpInputPath) fs.unlink(tmpInputPath, () => {});
        if (exportedFilePath) fs.unlink(exportedFilePath, () => {});
      }
    })();

    res.json({ jobId });
  } catch (error: any) {
    console.error('Optimize start error:', error);
    res.status(500).json({ error: error.message || 'Failed to start optimization' });
  }
});

app.get('/api/video/job/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});`;

serverCode = serverCode.replace(exportRouteRegex, newOptimizeLogic);
fs.writeFileSync('server.ts', serverCode);
