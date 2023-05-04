import React from 'react';

interface ResultsProps {
    downloadSpeed: number | null;
    uploadSpeed: number | null;
    ping: number | null;
}

const Results: React.FC<ResultsProps> = ({ downloadSpeed, uploadSpeed , ping}) => {
    return (
        <div>
            <h2>Results</h2>
            <p>Download Speed: {downloadSpeed ? downloadSpeed.toFixed(2) : 'N/A'} Mbps</p>
            <p>Upload Speed: {uploadSpeed ? uploadSpeed.toFixed(2) : 'N/A'} Mbps</p>
            <p>Ping: {ping ? ping.toFixed(2) : 'N/A'} Mbps</p>
        </div>
    );
};

export default Results;
