// src/components/LiveStreamPlayer.js
import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming/dist/videojs-http-streaming.min.js';
import axios from 'axios';

const LiveStreamPlayer = () => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const [streamAvailable, setStreamAvailable] = useState(false);

    useEffect(() => {
        // Verificar si el archivo .m3u8 está disponible
        const checkStreamAvailability = async () => {
            try {
                const response = await axios.get('http://localhost:3001/slv/stream.m3u8');
                if (response.status === 200) {
                    setStreamAvailable(true);
                }
            } catch (error) {
                console.error('Error checking stream availability:', error);
            }
        };

        checkStreamAvailability();
    }, []);

    useEffect(() => {
        if (videoRef.current && streamAvailable) {
            console.log('Initializing Video.js player');
            playerRef.current = videojs(videoRef.current, {
                controls: true,
                autoplay: true,
                preload: 'auto',
                fluid: true,
                sources: [{
                    src: 'http://localhost:3001/slv/stream.m3u8',
                    type: 'application/x-mpegURL'
                }]
            });

            // Manejar errores y reconectar
            playerRef.current.on('error', function() {
                console.error('Error en la transmisión');
                setTimeout(() => {
                    playerRef.current.src({ src: 'http://localhost:3001/slv/stream.m3u8', type: 'application/x-mpegURL' });
                    playerRef.current.load();
                    playerRef.current.play();
                }, 5000); // Retraso de 5 segundos
            });
        }

        return () => {
            if (playerRef.current) {
                console.log('Disposing Video.js player');
                playerRef.current.dispose();
            }
        };
    }, [streamAvailable]);

    return (
        <div data-vjs-player>
            <video ref={videoRef} className="video-js vjs-default-skin" />
        </div>
    );
};

export default LiveStreamPlayer;
