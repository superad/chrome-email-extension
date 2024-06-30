<template>
  <div>
    <input
      type="hidden"
      :value="reload"
      @input="emit('update:reload', ($event.target as HTMLInputElement).value)"
    />
    <a-alert
      v-if="loadingVisible"
      message="阿里云邮件加载中..."
      type="success"
      show-icon
      closable
    />
    <a-alert v-if="errorMsgVisible" :message="errorMsg" type="warning" show-icon closable />
    <br />

    <div>
      <h3>邮件详情:</h3>
      <table border="1" v-for="(email_table, table_index) in email_tables" style="margin: 8px 5px">
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
const reloadCookieSuccess = ref(false)

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

//弹出提示框
const loadingVisible = ref<boolean>(true) //1s自动关闭
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

function reloadCookies(callback: Function) {
  reloadCookieSuccess.value = false
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
        let _csrf_token_ = response.cookies.find(
          (cookie: any) => cookie.name === '_csrf_token_'
        ).value
        csrf_token.value = _csrf_token_
        cookies_str.value = response.cookies
          .map((cookie: any) => {
            return cookie.name + '=' + cookie.value
          })
          .join(';')
        reloadCookieSuccess.value = true
        //执行回调
        console.log('reloadCookies execute callback start. ')
        callback()
        console.log('reloadCookies execute callback end. ')
      } else {
        console.log('reloadCookies failed,response is :', response)
      }
    })
  } catch (err) {
    console.log('reloadCookies failed. ', err)
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
  header: string[]
  datas: EmailData[]
}
const email_tables = ref([] as EmailTable[])

async function reloadEmails() {
  if (!reloadCookieSuccess.value) {
    console.log('ReloadEmails failed. reloadCookieSuccess is :', reloadCookieSuccess.value)
    showErrorMsg('登录已过期，请重新登录邮箱。')
    return
  }
  setCookies()
  let respMsg = ''
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
      if (data.from.email === 'xiaoyao@hztrust.com') {
        let email = {} as Email
        email['subject'] = data.subject
        email['mailId'] = data.mailId
        email['timestamp'] = data.timestamp
        email['from'] = data.from.email
        email['status'] = data.status
        emails.value.push(email)
      }
    })
    console.log('getEmailList: ', emails.value)
  } catch (error) {
    console.error('Error getEmailList: ', error)
    respMsg = 'An Error Occurred'
    showErrorMsg('读取邮件列表失败，请联系开发人员。')
  }
}

function pureString(input: string): string {
  return input.replace(/\n/g, '').replace(/ /g, '')
}

const parseHtml = (html: string) => {
  const doc = domParser.value?.parseFromString(html, 'text/html')
  if (!doc) {
    console.log('DOMParser instance is null or undefined.')
    showErrorMsg('邮件解析失败，请联系开发人员。')
    return
  }
  const table = doc.querySelector('table')
  const rows = Array.from(table!.rows)
  console.log('ParseHtml rows length: ', rows.length)

  const email_table = {
    header: [],
    datas: [] as EmailData[]
  } as EmailTable

  let row_num = 0
  let header_length = 0
  for (const row of rows) {
    const cells = Array.from(row.cells)
    console.log('ParseHtml cells length: ', cells.length)
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
  //清空数组
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
      const html = responseData.data.body
      parseHtml(html)
    } catch (err) {
      console.log('reloadEmailDetail failed. ', err)
      showErrorMsg('阅读邮件详情失败，请联系开发人员。')
    }
  })

  console.log('email_tables: ', email_tables.value)
}

const props = defineProps(['reload'])
const emit = defineEmits(['update:reload'])
//加载入口，根据父组件reload值变化，重新加载邮件
watch(
  () => props.reload,
  () => {
    console.log('reload email: ', props.reload)
    //显示加载
    showLoadingTips()
    //加载cookie
    reloadCookies(async () => {
      //加载邮件列表
      await reloadEmails()
      //加载邮件详情
      await reloadEmailDetails()
    })
  },
  //首次加载,直接生效
  { immediate: true }
)
</script>

<style lang="scss" scoped></style>
