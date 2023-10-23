import axios from 'axios';

const api = axios.create({
  baseURL: "http://your_backend_url/api"
});

export const waterPlant = () => api.post('/waterPlant');
export const getSensorData = () => api.get('/sensorData');
export const toggleWatering = (status) => api.post('/toggleWatering', { status });

export default api;
