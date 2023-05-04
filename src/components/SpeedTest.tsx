import React, { useState } from 'react';
import axios from 'axios';
import Results from './Results';
import {SERVER_URL} from "../constants";

const SpeedTest: React.FC = () => {
    const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
    const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
    const [ping, setPing] = useState<number | null>(null);
    const [progress, setProgress] = useState<number>(0);


    const handleTest = async () => {

        //calculate ping
        setProgress(0);
        const startTimePing = performance.now();
        const responsePing = await axios.get(`${SERVER_URL}/ping`);
        const endTimePing = performance.now();

        if (responsePing.status === 200) {
            const ping = endTimePing - startTimePing;
            setPing(ping);
        }
        setProgress(33);

        //calculate download
        const startTimeDownload = performance.now();
        const responseDownload = await axios.get(`${SERVER_URL}/download`, { responseType: 'arraybuffer' });
        const endTimeDownload = performance.now();

        if (responseDownload.status === 200) {
            const dataSize = responseDownload.data.byteLength;
            const durationDownload = (endTimeDownload - startTimeDownload) / 1000;
            const speedDownload = (dataSize / durationDownload) * 8 / 1_000_000; // Convert to Mbps
            setDownloadSpeed(speedDownload);
            setProgress(66);
        }

        //calculate upload
        const dataSizeUpload = 10 * 1024 * 1024; // 10MB
        const dataUpload = new ArrayBuffer(dataSizeUpload);
        const startTimeUpload = performance.now();
        const responseUpload = await axios.post(`${SERVER_URL}/upload`, dataUpload);
        const endTimeUpload = performance.now();

        if (responseUpload.status === 200) {
            const durationUpload = (endTimeUpload - startTimeUpload) / 1000;
            const speedUpload = (dataSizeUpload / durationUpload) * 8 / 1_000_000; // Convert to Mbps
            setUploadSpeed(speedUpload);
            setProgress(100);
        }

        setTimeout(() => {
            setProgress(0);
        }, 2000);
    };



    return (
        <div>
            <h1>SpeedTest Simulator</h1>
            <button onClick={handleTest}>Test Speed</button>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <Results downloadSpeed={downloadSpeed} uploadSpeed={uploadSpeed} ping={ping} />
        </div>
    );
};

export default SpeedTest;
