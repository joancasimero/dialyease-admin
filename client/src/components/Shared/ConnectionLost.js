import React from 'react';
import './ConnectionLost.css';

const ConnectionLost = () => {
  return (
    <div className="connection-lost-container">
      <div className="connection-lost-content">
        <div className="connection-lost-icon">
          <div className="connection-icon">
            📡❌
          </div>
        </div>
        <h1>Connection Lost</h1>
        <p>
          The system has lost connection.<br />
          Please verify your network settings and try again.
        </p>
      </div>
    </div>
  );
};

export default ConnectionLost;
