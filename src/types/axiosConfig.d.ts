declare module '@/axiosConfig' {
  import { type AxiosInstance } from 'axios'
  export default function createAxiosInstance(baseURL: string): AxiosInstance
}
