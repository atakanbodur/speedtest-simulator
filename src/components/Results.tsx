import React from "react";
import { STAT_REFRESH_INTERVAL, TIMEOUT } from "../constants";
interface ResultsProps {
    downloadSpeedHistory: any[];
    ping: number | null;
    downloadStartTime: number;
    uploadStartTime: number;
    uploadSpeedHistory: any[];
    totals: number[];
}

const Results: React.FC<ResultsProps> = ({ downloadSpeedHistory, uploadSpeedHistory, ping, downloadStartTime, uploadStartTime, totals }) => {
    const stats = (history: any[], startTime: number) => {
        if (!history.length) {
            return {
                speed: null,
                avg: null,
                median: null,
                min: null,
                max: null,
            };
        }

        let speedsPerSlot: number[] = new Array(Math.ceil(TIMEOUT / (STAT_REFRESH_INTERVAL * 2))).fill(0);
        history.forEach(([timestamp, speed], index) => {
            const diff = timestamp - startTime;
            const slot = (diff - (diff % STAT_REFRESH_INTERVAL)) / (STAT_REFRESH_INTERVAL * 2);
            speedsPerSlot[slot] = speed;
        });
        // a few samples at the beginning are 0, so remove them
        speedsPerSlot = speedsPerSlot.filter((speed) => speed > 0);

        // sort by speed
        const sorted = speedsPerSlot.sort((a, b) => a - b);

        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const speed = median || avg;
        const min = sorted[0];
        const max = sorted[speedsPerSlot.length - 1];

        return {
            speed,
            avg,
            median,
            min,
            max,
        };
    };

    const statToString = (stat: number | null, unit: string = 'Mbps') => {
        if (stat === undefined || stat === null) {
            return "-";
        }
        return stat.toFixed(2) + " " + unit;
    };

    const downloadStats = stats(downloadSpeedHistory, downloadStartTime);
    const uploadStats = stats(uploadSpeedHistory, uploadStartTime);

    const totalDownloaded = (totals?.length ? totals[0] / Math.pow(10, 6) : 0).toFixed(1) + ' MB';
    const totalUploaded = (totals?.length ? totals[1] / Math.pow(10, 6) : 0).toFixed(1) + ' MB';

    return (
        <div className="results">
            <h2>Results</h2>
            <div className="results_speed">
                <div className="results_speed_download">
                    {statToString(downloadStats.speed)}
                    <div className="results_details_download details">
                        <span>Download</span>
                        <div>
                            <span className="label">Min:</span> {statToString(downloadStats.min)}
                        </div>
                        <div>
                            <span className="label">Max:</span> {statToString(downloadStats.max)}
                        </div>
                        <div>
                            <span className="label">Median:</span> {statToString(downloadStats.median)}
                        </div>
                        <div>
                            <span className="label">Average:</span> {statToString(downloadStats.avg)}
                        </div>
                        <div>
                            <span className="label">Downloaded:</span> {totalDownloaded}
                        </div>
                    </div>
                </div>
                <div className="results_speed_upload">
                    {statToString(uploadStats.speed)}
                    <div className="results_details_upload details">
                        <span>Upload</span>
                        <div>
                            <span className="label">Min:</span> {statToString(uploadStats.min)}
                        </div>
                        <div>
                            <span className="label">Max:</span> {statToString(uploadStats.max)}
                        </div>
                        <div>
                            <span className="label">Median:</span> {statToString(uploadStats.median)}
                        </div>
                        <div>
                            <span className="label">Average:</span> {statToString(uploadStats.avg)}
                        </div>
                        <div>
                            <span className="label">Uploaded:</span> {totalUploaded}
                        </div>
                    </div>
                </div>
            </div>

            <div className="results_ping">
                <div>Ping: {ping ? ping.toFixed(2) + " ms" : "-"}</div>
            </div>
        </div>
    );
};

export default Results;
