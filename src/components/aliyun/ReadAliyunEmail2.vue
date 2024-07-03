<template>
  <div>
    <a-alert v-show="loadingVisible" :message="tipMsg" type="success" show-icon closable />
    <a-alert v-show="errorMsgVisible" :message="errorMsg" type="warning" show-icon closable />

    <div style="margin: 8px 5px">
      <a-flex vertical="vertical" gap="middle">
        <div
          v-for="(item, index) in email_contents"
          :key="item.email['mailId']"
          :style="{ ...baseStyle }"
        >
          <p>发件人:{{ item.email['from'] }}</p>
          <p>主题:{{ item.email['subject'] }}</p>
          <p>发件时间:{{ item.email['date'] }}</p>
          <div v-html="item.html"></div>
          <a-divider style="height: 2px; background-color: #7cb305">邮件分割线</a-divider>
        </div>
      </a-flex>
    </div>
  </div>
</template>

<script setup lang="ts" name="ReadAliyunEmail">
import { onMounted, ref, watch } from 'vue'
import { type AxiosInstance } from 'axios'
import createAxiosInstance from '@/axiosConfig'
import DOMPurify from 'dompurify'
import type { CSSProperties } from 'vue'

const header_str = ref('header')
const row_str = ref('row')
const cell_str = ref('cell')
const tipMsg = ref('阿里云邮件加载中...')
const email_contents = ref([] as EmailContent[])

const baseStyle: CSSProperties = {
  width: '45%'
}

//cookies 相关
const cookies = ref([])
const cookies_str = ref('')
const csrf_token = ref('')
const loadCookieSuccess = ref(false)

//初始化单实例
const baseURL = ref('https://mail.aliyun.com')
const axiosInstance = ref<AxiosInstance>()
const domParser = ref<DOMParser>()
onMounted(() => {
  axiosInstance.value = createAxiosInstance(baseURL.value)
  domParser.value = new DOMParser()
})

//加载数据
const emails = ref([] as Email[])
const reload = ref('init-1')

//对外通讯变量
const props = defineProps(['reload', 'filterEmails'])
const emit = defineEmits(['update:reload'])

//弹出提示框
const loadingVisible = ref<boolean>(false) //1s自动关闭
const showLoadingTips = () => {
  //显示加载
  loadingVisible.value = true
  setTimeout(() => {
    loadingVisible.value = false
  }, 1000)
}
const errorMsgVisible = ref<boolean>(false) //1.5s 自动关闭
const errorMsg = ref('')
const showErrorMsg = (errmsg: string) => {
  if (!errmsg) {
    console.error('showErrorMsg failed. errmsg is required.')
    return
  }
  errorMsg.value = errmsg
  errorMsgVisible.value = true
  loadingVisible.value = false
  setTimeout(() => {
    errorMsgVisible.value = false
  }, 2500)
}

function getDomainFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname
  } catch (e) {
    console.error('Invalid URL:', e)
    return null
  }
}

function loadCookies(callback: Function) {
  loadCookieSuccess.value = false
  let domain = getDomainFromUrl(baseURL.value)
  try {
    chrome.runtime.sendMessage({ action: 'GetCookies', domain: domain }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('GetCookies error: ', chrome.runtime.lastError.message)
        showErrorMsg(chrome.runtime.lastError.message || '登录已过期，请重新登录邮箱。')
        return
      }
      if (response && response.cookies) {
        cookies.value = response.cookies
        cookies_str.value = response.cookies
          .map((cookie: any) => {
            return cookie.name + '=' + cookie.value
          })
          .join(';')

        let csrf_token_cookie = response.cookies.find(
          (cookie: any) => cookie.name === '_csrf_token_'
        )
        if (csrf_token_cookie) {
          csrf_token.value = csrf_token_cookie.value
        } else {
          showErrorMsg('登录已过期，请重新登录邮箱。')
          return
        }
        loadCookieSuccess.value = true
        //执行回调
        console.log('loadCookies execute callback start. ')
        callback()
        console.log('loadCookies execute callback end. ')
      } else {
        console.log('loadCookies failed. response is:', response)
      }
    })
  } catch (err) {
    console.log('loadCookies failed. ', err)
    showErrorMsg('加载登录信息失败，请联系开发人员。')
  }
}

function setCookies() {
  let domain = getDomainFromUrl(baseURL.value)
  chrome.runtime.sendMessage(
    {
      action: 'SetCookies',
      url: baseURL.value,
      domain: domain,
      value: cookies.value
    },
    (response: any) => {
      if (response) {
        console.log('cookies set successfully!', response)
      } else {
        console.log('cookies set failed.', response)
      }
    }
  )
}

interface Email {
  [key: string | number]: any
}

interface EmailContent {
  email: Email
  html: string
}

function checkEmail(email: string): boolean {
  if (!props.filterEmails || props.filterEmails.size === 0) {
    return true
  }
  return props.filterEmails.includes(email)
}

const dateConvert = (timestamp: number): string => {
  if (!timestamp) {
    return ''
  }
  let date = new Date(timestamp)
  // 格式化日期
  let year = date.getFullYear()
  let month = ('0' + (date.getMonth() + 1)).slice(-2) // 月份是从 0 开始的，所以加 1
  let day = ('0' + date.getDate()).slice(-2)
  let hours = ('0' + date.getHours()).slice(-2)
  let minutes = ('0' + date.getMinutes()).slice(-2)
  let seconds = ('0' + date.getSeconds()).slice(-2)
  let dateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  return dateString
}

async function reloadEmails() {
  if (!loadCookieSuccess.value) {
    console.log('ReloadEmails failed. loadCookieSuccess is :', loadCookieSuccess.value)
    showErrorMsg('登录已过期，请重新登录邮箱。')
    return
  }
  setCookies()
  let respMsg = ''
  //清空邮箱数组
  emails.value.length = 0
  try {
    const formData = new FormData()
    const query = {
      fromStrings: props.filterEmails,
      advancedSearch: true
    }
    console.log('reloadEmails query is : ', JSON.stringify(query))
    formData.append('query', JSON.stringify(query))
    formData.append('showFrom', '1')
    formData.append('offset', '0')
    formData.append('length', '75')
    formData.append('_tpl_', 'v5ForWebDing')
    formData.append('_refer_hash_', '')
    formData.append('_root_token_', '')
    formData.append('_csrf_token_', csrf_token.value)
    const response = await axiosInstance.value!.post(
      '/alimail/ajax/mail/queryMailList.txt',
      formData
    )
    respMsg = 'success'
    const dataList = response.data.dataList
    if (!dataList) {
      console.error('getEmailList dataList is empty!')
      return
    }

    dataList.forEach((data: any) => {
      if (checkEmail(data.from.email)) {
        let email = {} as Email
        email['subject'] = data.subject
        email['mailId'] = data.mailId
        email['timestamp'] = data.timestamp
        email['date'] = dateConvert(data.timestamp)
        email['from'] = data.from.email
        email['status'] = data.status
        emails.value.push(email)
      }
    })
  } catch (error) {
    console.error('Error getEmailList: ', error)
    respMsg = 'An Error Occurred'
    showErrorMsg('读取邮件列表失败，请联系开发人员。')
  }
}

const parseHtml = (email: Email, html: string) => {
  if (!html) {
    console.log('parseHtml is empty. mailId: ', email['mailId'])
    return
  }
  const sanitize = DOMPurify.sanitize(html)
  const email_content = {
    email: email,
    html: sanitize
  }
  email_contents.value.push(email_content)
  console.log('parseHtml success. mailId: ', email['mailId'])
}

async function reloadEmailDetails() {
  if (emails.value.length == 0) {
    console.log('reloadEmailDetail failed. emails is empty. length: ', emails.value.length)
    showErrorMsg('暂无最新邮件需要阅读.')
    return
  }
  //清空邮件内容数组
  email_contents.value.length = 0
  emails.value.forEach(async (email: Email) => {
    try {
      const formData = new FormData()
      formData.append('mailId', email['mailId'])
      formData.append('full', '1')
      formData.append('_tpl_', 'v5ForWebDing')
      formData.append('_refer_hash_', '')
      formData.append('_root_token_', '')
      formData.append('_csrf_token_', csrf_token.value)
      const response = await axiosInstance.value!.post('/alimail/ajax/mail/loadMail.txt', formData)
      const responseData = response.data
      if (responseData.data.body) {
        const html = responseData.data.body
        parseHtml(email, html)
      } else {
        console.log('responseData has no body: ', responseData.data)
      }
    } catch (err) {
      console.log('reloadEmailDetail failed. ', err)
      showErrorMsg('阅读邮件详情失败，请联系开发人员。')
    }
  })
}

//加载入口，根据父组件reload值变化，重新加载邮件
watch([() => props.reload], () => {
  //显示加载
  showLoadingTips()
  console.log('reload email: ', props.reload, 'filterEmails: ', props.filterEmails)
  if (!props.filterEmails || props.filterEmails.length == 0) {
    console.log('filterEmails is empty,stop readEmail')
    showErrorMsg('请配置过滤邮箱。')
    return
  }
  //加载cookie
  loadCookies(async () => {
    //加载邮件列表
    await reloadEmails()
    //加载邮件详情
    await reloadEmailDetails()
  })
})
</script>

<style lang="scss" scoped></style>
