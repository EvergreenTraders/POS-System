const host = window.location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

const config = {
  // Allow override via env at build time (CRA uses REACT_APP_* vars)
  apiUrl: process.env.REACT_APP_API_URL
    || (isLocal ? 'http://localhost:5000/api' : 'http://35.183.203.62:5000/api')
};

export default config;
