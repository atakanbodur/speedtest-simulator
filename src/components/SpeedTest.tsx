import React, { useEffect, useState } from "react";
import axios from "axios";
import Results from "./Results";
import { create } from "../appSettings";
import { STAT_REFRESH_INTERVAL, TIMEOUT, DOWNLOADED_FILE_SIZE, THREAD_COUNT, UPLOAD_FILE_SIZE } from "../constants";
const appSettings = create();

const SpeedTest: React.FC = () => {
    const [ping, setPing] = useState<number | null>(null);

    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
    const [downloadSpeedHistory, setDownloadSpeedHistory] = useState<any[]>([]);
    const [downloadStartTime, setDownloadStartTime] = useState<number>(0);

    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadSpeed, setUploadSpeed] = useState<number>(0);
    const [uploadSpeedHistory, setUploadSpeedHistory] = useState<any[]>([]);
    const [uploadStartTime, setUploadStartTime] = useState<number>(0);
    const [continueDownloadOrUpload, setContinueDownloadOrUpload] = useState<boolean>(false);
    const [lastTotals, setLastTotals] = useState<number[]>([0, 0]);

    let downloadUpdateTimer: NodeJS.Timer;
    let uploadUpdateTimer: NodeJS.Timer;

    let lastSmallDownloadSpeed = 0;
    let _downloadStartTime = 0;
    let _uploadStartTime = 0;

    let continueDownloadUpload = false;
    const bucketLastCheckTimes: Map<number, number> = new Map();
    const bucketDownloadSpeeds: number[] = [];
    const bucketUploadSpeeds: number[] = [];
    const bucketDownloadProgresses: number[] = [];
    const bucketUploadProgresses: number[] = [];
    const totals: number[] = [0, 0];
    // start test
    const startTest = async () => {
        console.log("Starting test...");

        // reset state
        setUploadSpeed(0);
        setPing(null);
        setDownloadProgress(0);
        setDownloadSpeed(0);
        setDownloadSpeedHistory([]);

        // initialize buckets
        bucketDownloadSpeeds.splice(0);
        bucketUploadSpeeds.splice(0);
        bucketDownloadProgresses.splice(0);
        bucketUploadProgresses.splice(0);
        for (let i = 0; i < THREAD_COUNT; i++) {
            bucketDownloadSpeeds.push(0);
            bucketDownloadProgresses.push(0);
            bucketUploadSpeeds.push(0);
            bucketUploadProgresses.push(0);
        }

        // initialized totals (total downloaded, total uploaded)
        totals[0] = 0;
        totals[1] = 0;
        setLastTotals([0, 0]);

        setDownloadStartTime(performance.now());
        _downloadStartTime = performance.now();
        continueDownloadUpload = true;

        let threads = [];

        for (let i = 0; i < THREAD_COUNT; i++) {
            threads.push(download(i));
        }
        threads.push(downloadSmallFiles());
        setTimeout(() => updateDownloadStats(TIMEOUT, STAT_REFRESH_INTERVAL, _downloadStartTime), STAT_REFRESH_INTERVAL);
        await Promise.all(threads);

        setUploadStartTime(performance.now());
        _uploadStartTime = performance.now();
        continueDownloadUpload = true;
        threads = [];
        for (let i = 0; i < THREAD_COUNT; i++) {
            threads.push(upload(i));
        }
        setTimeout(() => updateUploadStats(TIMEOUT, STAT_REFRESH_INTERVAL, _uploadStartTime), STAT_REFRESH_INTERVAL);

        setTimeout(() => {
            pinger();
        }, TIMEOUT);
        return true;
    };

    const pinger = async (pingCount: number = 10, pingInterval: number = 250) => {
        const ping = async () => {
            const startTime = performance.now();
            await axios.get(appSettings.pingUrl + "?r=" + Math.round(Math.random() * 1000000)).then((response) => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                const ping = duration ?? 0;
                setPing(ping);
            });
        };

        if (pingCount > 0) {
            await ping();
            setTimeout(() => pinger(pingCount - 1), pingInterval);
        }
    };

    const downloadSmallFiles = async () => {
        const getSpeed = (fileSize: number): Promise<number> => {
            return new Promise((resolve, reject) => {
                const startTime = performance.now();
                let size = 0;
                axios.get(appSettings.downloadUrl2 + fileSize.toString() + "?r=" + Math.round(Math.random() * 1000000), {
                    responseType: "blob",
                    onDownloadProgress: (progressEvent) => {
                        size = progressEvent.total ?? 0;
                        // console.log('downloadSmallFiles | size', size, progressEvent);
                        if (progressEvent.progress ?? 0 >= 1) {
                            const endTime = performance.now();
                            const duration = (endTime - startTime) / 1000;
                            const speed = duration > 0 ? (size * 8) / duration / Math.pow(10, 6) : 0; // bytes per second
                            console.log("downloadSmallFiles | speed", size, duration, speed);
                            totals[0] += size;
                            resolve(speed);
                        }
                    },
                });
            });
        };

        while (continueDownloadUpload) {
            // download small files in parallel
            const jobs = [];
            const speeds: number[] = [];
            for (let i = 0; i < 5; i++) {
                jobs.push(getSpeed(Math.round(Math.random() * 5000)).then((speed) => speeds.push(speed)));
            }
            await Promise.all(jobs);
            lastSmallDownloadSpeed = speeds.reduce((a, b) => a + b, 0);
            console.log("downloadSmallFiles | lastSmallDownloadSpeed", lastSmallDownloadSpeed, continueDownloadUpload);
            await new Promise((resolve, reject) => setTimeout(resolve, Math.random() * 500 + 100));
        }
    };

    const updateProgress = (uploadOrDownload: string = "download") => {
        // get the average
        let downloadProgresses = uploadOrDownload === "download" ? bucketDownloadProgresses : bucketUploadProgresses;
        
        // update totals
        setLastTotals(totals);

        const bucketAvg = downloadProgresses.reduce((a, b) => a + b, 0) / bucketDownloadProgresses.length;
        if (bucketAvg >= 100) {
            if (uploadOrDownload === "download") {
                setDownloadProgress(100);
                setContinueDownloadOrUpload(false);
                continueDownloadUpload = false;
            } else {
                setUploadProgress(100);
                setContinueDownloadOrUpload(false);
                continueDownloadUpload = false;
            }
            return;
        }
        if (uploadOrDownload === "download") {
            setDownloadProgress(bucketAvg);
        } else {
            setUploadProgress(bucketAvg);
        }
    };

    const updateSpeeds = (uploadOrDownload: string = "download") => {
        // sum the speeds that are not 100% complete
        let total = 0;
        const bucketProgresses = uploadOrDownload === "download" ? bucketDownloadProgresses : bucketUploadProgresses;

        bucketProgresses.forEach((progress, index) => {
            if (progress < 100) {
                if (uploadOrDownload === "download") {
                    total += bucketDownloadSpeeds[index];
                } else {
                    total += bucketUploadSpeeds[index];
                }
            }
        });

        console.log("updateSpeeds | total", total, bucketDownloadSpeeds, bucketUploadSpeeds, bucketProgresses);

        if (uploadOrDownload === "download") {
            // for download, we also add the last small download speed
            total += lastSmallDownloadSpeed;
            setDownloadSpeed(total);
            setDownloadSpeedHistory((downloadSpeedHistory) => {
                downloadSpeedHistory.push([performance.now(), total]);
                return downloadSpeedHistory;
            });
        } else {
            setUploadSpeed(total);
            setUploadSpeedHistory((uploadSpeedHistory) => {
                uploadSpeedHistory.push([performance.now(), total]);
                return uploadSpeedHistory;
            });
        }
    };

    const updateDownloadStats = (duration: number, interval: number, startTime: number) => {
        console.log("updateDownloadStats | continueDownloadUpload: %d duration: %d interval: %d startTime: %d", continueDownloadUpload, duration, interval, startTime);

        if (downloadUpdateTimer) {
            clearTimeout(downloadUpdateTimer);
        }

        let completed = bucketDownloadProgresses.filter((progress) => progress === 100).length;
        if (completed === THREAD_COUNT) {
            continueDownloadUpload = false;
            return;
        }

        if (startTime + duration < performance.now()) {
            console.log("updateDownloadStats | stopping updating stats");
            continueDownloadUpload = false; // stop the download
            return;
        }

        updateProgress("download");
        updateSpeeds("download");

        downloadUpdateTimer = setTimeout(() => {
            updateDownloadStats(duration, interval, startTime);
        }, interval);
    };

    const updateUploadStats = (duration: number, interval: number, startTime: number) => {
        console.log("updateUploadStats | continueDownloadUpload: %d duration: %d interval: %d startTime: %d", continueDownloadUpload, duration, interval, startTime);

        if (uploadUpdateTimer) {
            clearTimeout(uploadUpdateTimer);
        }

        let completed = bucketUploadProgresses.filter((progress) => progress === 100).length;
        if (completed === THREAD_COUNT) {
            continueDownloadUpload = false;
            return;
        }

        if (startTime + duration < performance.now()) {
            console.log("updateUploadStats | stopping updating stats");
            continueDownloadUpload = false; // stop the download
            return;
        }

        updateProgress("upload");
        updateSpeeds("upload");

        uploadUpdateTimer = setTimeout(() => {
            updateUploadStats(duration, interval, startTime);
        }, interval);
    };

    const download = async (bucketId: number) => {
        console.log("download | bucketId: %s", bucketId);
        try {
            bucketLastCheckTimes.set(bucketId, performance.now());

            await axios.get(`${appSettings.downloadUrl}`, {
                responseType: "arraybuffer",
                onDownloadProgress: (progressEvent) => {
                    const checkTime = performance.now();
                    const duration = (checkTime - (bucketLastCheckTimes.get(bucketId) ?? 0)) / 1000;
                    bucketLastCheckTimes.set(bucketId, checkTime);

                    const mbitPerSec = (progressEvent.bytes * 8) / duration / 1_000_000;

                    // const progress = (progressEvent.loaded / DOWNLOADED_FILE_SIZE) * 100;
                    let progress = 0;

                    if (progressEvent.progress) {
                        progress = progressEvent.progress * 100;
                    } else {
                        progress = (progressEvent.loaded / DOWNLOADED_FILE_SIZE) * 100;
                    }

                    totals[0] += progressEvent.bytes;

                    // console.log("download | bucketId: %s progress", bucketId, progress, progressEvent);

                    if (bucketDownloadSpeeds[bucketId] !== undefined) {
                        bucketDownloadSpeeds[bucketId] = mbitPerSec;
                    }

                    bucketDownloadProgresses[bucketId] = progress;
                },
                timeout: TIMEOUT,
            });
        } catch (error) {
            console.log("download | error in bucketId: %s | error: %s", bucketId, error);
        }
    };

    // Upload Files
    const upload = async (bucketId: number) => {
        console.log("upload | bucketId: %s", bucketId);
        const dataSizeUpload = UPLOAD_FILE_SIZE;
        const dataUpload = new ArrayBuffer(dataSizeUpload);
        const startTimeUpload = performance.now();
        try {
            bucketLastCheckTimes.set(bucketId, performance.now());
            const responseUpload = await axios.post(`${appSettings.uploadUrl}`, dataUpload, {
                onUploadProgress: (progressEvent) => {
                    const checkTime = performance.now();
                    const duration = (checkTime - (bucketLastCheckTimes.get(bucketId) ?? 0)) / 1000;
                    bucketLastCheckTimes.set(bucketId, checkTime);

                    const mbitPerSec = (progressEvent.bytes * 8) / duration / 1_000_000;

                    totals[1] += progressEvent.bytes;

                    let progress = 0;

                    if (progressEvent.progress) {
                        progress = progressEvent.progress * 100;
                    } else {
                        progress = (progressEvent.loaded / UPLOAD_FILE_SIZE) * 100;
                    }

                    if (bucketUploadSpeeds[bucketId] !== undefined) {
                        bucketUploadSpeeds[bucketId] = mbitPerSec;
                    }

                    bucketUploadProgresses[bucketId] = progress;
                },
            });
            const endTimeUpload = performance.now();

            if (responseUpload.status === 200) {
                const durationUpload = (endTimeUpload - startTimeUpload) / 1000;
                const speedUpload = ((dataSizeUpload / durationUpload) * 8) / 1_000_000; // Convert to Mbps
                setUploadSpeed(speedUpload);
                // setDownloadProgress(100);
            }
        } catch (error) {
            console.warn("downloadSmallFiles | error", error);
        }
    };

    useEffect(() => {}, []);

    const getSpeedsPerSlot = (uploadOrDownload = "download") => {
        if (uploadOrDownload === "download" && !downloadSpeedHistory.length) {
            return [];
        }

        if (uploadOrDownload === "upload" && !uploadSpeedHistory.length) {
            return [];
        }

        const startTime = uploadOrDownload === "download" ? downloadStartTime : uploadStartTime;
        const history = uploadOrDownload === "download" ? downloadSpeedHistory : uploadSpeedHistory;
        let speedsPerSlot: number[] = new Array(Math.ceil(TIMEOUT / (STAT_REFRESH_INTERVAL * 2))).fill(0);
        history.forEach(([timestamp, speed], index) => {
            const diff = timestamp - startTime;
            const slot = (diff - (diff % (STAT_REFRESH_INTERVAL * 2))) / (STAT_REFRESH_INTERVAL * 2);
            speedsPerSlot[slot] = speed;
        });

        return speedsPerSlot;
    };

    const maxSpeed = 100; // 100 Mbps

    return (
        <div>
            <h1>SpeedTest Simulator</h1>
            <div className="controls">
                <button onClick={startTest}>Start</button>
            </div>
            <div id="progress-container-download" className="progress-container download">
                {getSpeedsPerSlot("download").map((speed, index, arr) => {
                    const theMaxSpeed = Math.max(...arr);
                    const progress = theMaxSpeed === 0 ? 0 : (speed / theMaxSpeed) * 100;
                    const width = (document.getElementById("progress-container-download")!.clientWidth / arr.length).toString() + "%";
                    return (
                        <div
                            key={index}
                            className={"progress-bar " + (speed === 0 ? "zero" : "")}
                            data-slot={index}
                            data-speed={speed}
                            title={`${(index / 1000) * STAT_REFRESH_INTERVAL}s ${speed.toFixed(1)}Mbps`}
                            style={{ height: `${progress}%`, width: width }}
                        >
                            <span>{speed.toFixed(1)} Mbps</span>
                        </div>
                    );
                })}
            </div>
            <div id="progress-container-upload" className="progress-container upload">
                {getSpeedsPerSlot("upload").map((speed, index, arr) => {
                    const theMaxSpeed = Math.max(...arr);
                    const progress = theMaxSpeed === 0 ? 0 : (speed / theMaxSpeed) * 100;
                    const width = (document.getElementById("progress-container-upload")!.clientWidth / arr.length).toString() + "%";
                    return (
                        <div
                            key={index}
                            className={"progress-bar " + (speed === 0 ? "zero" : "")}
                            data-slot={index}
                            data-speed={speed}
                            title={`${(index / 1000) * STAT_REFRESH_INTERVAL}s ${speed.toFixed(1)}Mbps`}
                            style={{ height: `${progress}%`, width: width }}
                        >
                            <span>{speed.toFixed(1)} Mbps</span>
                        </div>
                    );
                })}
            </div>
            <Results
                totals={lastTotals}
                downloadSpeedHistory={downloadSpeedHistory}
                uploadSpeedHistory={uploadSpeedHistory}
                ping={ping}
                downloadStartTime={downloadStartTime}
                uploadStartTime={uploadStartTime}
            />
        </div>
    );
};

export default SpeedTest;
