import axios from 'axios'

//创建实例
const createAxiosInstance = (baseURL) => {
  return axios.create({
    baseURL: baseURL,
    // 其他默认配置
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}
export default createAxiosInstance
