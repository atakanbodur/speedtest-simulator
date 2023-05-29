import React from 'react';
import { STAT_REFRESH_INTERVAL, TIMEOUT } from '../constants';
interface ResultsProps {
    downloadSpeedHistory: any[];
    ping: number | null;
    downloadStartTime: number;
    uploadStartTime: number;
    uploadSpeedHistory: any[];
}

const Results: React.FC<ResultsProps> = ({ downloadSpeedHistory, uploadSpeedHistory , ping, downloadStartTime, uploadStartTime}) => {

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

    const statToString = (stat: number | null) => {
        if (stat === undefined || stat === null) {
            return '-';
        }
        return stat.toFixed(2) + ' Mbps';
    };

    const downloadStats = stats(downloadSpeedHistory, downloadStartTime);
    const uploadStats = stats(uploadSpeedHistory, uploadStartTime);

    return (
        <div className="results">
            <h2>Results</h2>
            <div className="results_speed">
                <div className="results_speed_download">
                    {statToString(downloadStats.speed)}
                    <div className="results_details_download details">
                        <span>Download</span>
                        <div>Min: {statToString(downloadStats.min)}</div>
                        <div>Max: {statToString(downloadStats.max)}</div>
                        <div>Median: {statToString(downloadStats.median)}</div>
                        <div>Average: {statToString(downloadStats.avg)}</div>
                    </div>
                </div>
                <div className="results_speed_upload">
                    {statToString(uploadStats.speed)}
                    <div className="results_details_upload details">
                        <span>Upload</span>
                        <div>Min: {statToString(uploadStats.min)}</div>
                        <div>Max: {statToString(uploadStats.max)}</div>
                        <div>Median: {statToString(uploadStats.median)}</div>
                        <div>Average: {statToString(uploadStats.avg)}</div>
                    </div>
                </div>
            </div>
            
            <div className="results_ping">
                <div>Ping: {ping ? ping.toFixed(2) + ' ms' : '-'}</div>
            </div>
        </div>
    );
};

export default Results;
