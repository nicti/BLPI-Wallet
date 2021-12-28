import axios from 'axios';
const ax = axios.create({
    baseURL: process.env.VUE_APP_API_URL,
    withCredentials: true
})

if (ax === null) {
    throw "Could not initiate axios for API connection!"
}

export default ax