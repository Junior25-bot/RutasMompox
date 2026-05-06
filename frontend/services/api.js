import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.101.7:3000", 
});

export default API;