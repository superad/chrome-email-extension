<template>
  <div>
    <input
      type="hidden"
      :value="reload"
      @input="emit('update:reload', ($event.target as HTMLInputElement).value)"
    />

    <a-alert
      v-show="loadingVisible"
      message="阿里云邮件加载中..."
      type="success"
      show-icon
      closable
    />
    <a-alert v-if="errorMsgVisible" :message="errorMsg" type="warning" show-icon closable />
    <div style="margin: 8px 5px">
      <h3>邮件详情:</h3>
      <div v-for="(email_table, table_index) in email_tables">
        <span>发件人:{{ email_table.from }} 主题: {{ email_table.title }}</span>
        <table border="1" style="margin: 8px 5px">
          <thead>
            <tr>
              <th
                v-for="(header, header_index) in email_table.header"
                :key="header_str.concat(table_index + '', header_index + '')"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row_data, row_index) in email_table.datas"
              :key="row_str.concat(table_index + '', row_index + '')"
            >
              <td
                v-for="(cell_data, cell_index) in row_data"
                :key="cell_str.concat(table_index + '', row_index + '', cell_index + '')"
              >
                {{ cell_data }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="ReadAliyunEmail">
import { onMounted, ref, watch } from 'vue'
import { type AxiosInstance } from 'axios'
import createAxiosInstance from '@/axiosConfig'

const header_str = ref('header')
const row_str = ref('row')
const cell_str = ref('cell')

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

interface EmailData {
  [key: string]: any
}

interface EmailTable {
  from: string
  title: string
  header: string[]
  datas: EmailData[]
  description?: string
}

function checkEmail(email: string): boolean {
  if (!props.filterEmails || props.filterEmails.size === 0) {
    return true
  }
  return props.filterEmails.includes(email)
}

const email_tables = ref([] as EmailTable[])

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
    formData.append('query', '{"folderIds":["2"]}')
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

function pureString(input: string): string {
  return input.replace(/\n/g, '').replace(/ /g, '')
}

const parseHtml = (responseData: any, html: string) => {
  // console.log('parseHtml get responseData,', responseData)
  const doc = domParser.value?.parseFromString(html, 'text/html')
  if (!doc) {
    console.log('DOMParser instance is null or undefined.')
    showErrorMsg('邮件解析失败，请联系开发人员。')
    return
  }
  const table = doc.querySelector('table')
  const rows = Array.from(table!.rows)
  // console.log('ParseHtml rows length: ', rows.length)

  let fromEmail = responseData.data.from.email + '(' + responseData.data.from.name + ')'
  const email_table = {
    from: fromEmail,
    title: responseData.data.subject,
    header: [],
    datas: [] as EmailData[],
    description: ''
  } as EmailTable

  let row_num = 0
  let header_length = 0
  for (const row of rows) {
    const cells = Array.from(row.cells)
    // console.log('ParseHtml cells length: ', cells.length)
    const datas = [] as string[]
    for (const cell of cells) {
      if (cell.textContent) {
        datas.push(pureString(cell.textContent))
      } else {
        datas.push('')
      }
    }
    if (row_num == 0) {
      // header
      email_table.header = datas
      header_length = datas.length
    } else if (datas.length == header_length) {
      //body
      email_table.datas.push(datas)
    }
    row_num++
  }
  email_tables.value.push(email_table)
}

async function reloadEmailDetails() {
  if (emails.value.length == 0) {
    console.log('reloadEmailDetail failed. emails is empty. length: ', emails.value.length)
    showErrorMsg('暂无最新邮件需要阅读.')
    return
  }
  //清空邮件内容数组
  email_tables.value.length = 0
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
        parseHtml(responseData, html)
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
