const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const NodeMediaServer = require('node-media-server');
const cors = require('cors');

const nms = new NodeMediaServer({
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
});

nms.run();

const slvPath = path.join(__dirname, 'slv');
if (!fs.existsSync(slvPath)) {
    fs.mkdirSync(slvPath, { recursive: true });
}

nms.on('prePublish', (id, streamPath, args) => {
    console.log(`Stream ${streamPath} started`);

    const outputFilePath = path.join(slvPath, 'stream.m3u8');

    if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
    }

    const ffmpegCommand = `ffmpeg -loglevel debug -i rtmp://192.168.2.110/live/test -c:v libx264 -c:a aac -f hls -hls_time 10 -hls_list_size 0 -hls_flags delete_segments -hls_segment_filename "slv/segment_%03d.ts" slv/stream.m3u8`;

    const ffmpegProcess = exec(ffmpegCommand);

    ffmpegProcess.stdout.on('data', (data) => {
        console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('error', (error) => {
        console.error(`ffmpeg process error: ${error.message}`);
    });

    ffmpegProcess.on('exit', (code) => {
        console.log(`ffmpeg process exited with code ${code}`);
    });
});

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use('/slv', express.static(slvPath));


// Endpoint SSE para notificar actualizaciones
app.get('/api/stream-updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const filePath = path.join(slvPath, 'stream.m3u8');
    fs.watchFile(filePath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            res.write('data: update\n\n');
        }
    });

    // Cierre de la conexión cuando el cliente se desconecta
    req.on('close', () => {
        fs.unwatchFile(filePath);
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
