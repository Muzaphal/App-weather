import axios from 'axios';
import { apiKey } from '../constants';

const forecastEndpoint = (params) =>
    `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(
        params.query
    )}&days=${params.days}`;

const locationEndpoint = (params) =>
    `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(
        params.cityName
    )}`;

const apiCall = async (endpoint) => {
    try {
        const response = await axios.get(endpoint);
        return response.data;
    } catch (error) {
        console.log(
            'Weather API error:',
            error.response?.data || error.message
        );
        return null;
    }
};

export const fetchWeatherForecast = (params) => {
    return apiCall(forecastEndpoint(params));
};

export const fetchLocations = (params) => {
    return apiCall(locationEndpoint(params));
};