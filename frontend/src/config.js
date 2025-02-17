const config = {
    apiUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api'
        : 'http://35.183.203.62:5000/api'
};

export default config;
