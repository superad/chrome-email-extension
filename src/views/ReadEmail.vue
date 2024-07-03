<template>
  <a-flex justify="space-between">
    <a-space-compact block size="middle" style="margin: 10px 5px">
      <a-select
        v-model:value="emailbox"
        style="width: 180px"
        placeholder="选择邮箱"
        option-label-prop="children"
      >
        <a-select-option
          v-for="option in options"
          :value="option.value"
          :label="option.label"
          :disabled="option.disabled"
        >
          <div style="display: flex">
            <Svg
              :option="{ src: option.icon, width: '20px', height: '20px' }"
              style="flex: 2"
            ></Svg>
            <span style="flex: 8"> {{ option.label }}</span>
          </div>
        </a-select-option>
      </a-select>
      <a-select
        :v-model="filterEmails"
        :value="filterEmails"
        mode="tags"
        style="width: 50%"
        placeholder="过滤发件箱"
        :max-tag-count="3"
        @change="handleChange"
      ></a-select>
      <a-button type="primary" size="middle" @click="loadEmail">加载邮件</a-button>
    </a-space-compact>
    <a-button style="margin: 10px 5px" type="link" size="middle" @click="reLogin"
      >重新登录</a-button
    >
  </a-flex>

  <div style="margin: 8px 5px">
    <ReadAliyunEmail2
      v-model:reload="reload"
      :filter-emails="filterEmails"
      v-if="emailbox === 'https://mail.aliyun.com'"
    />
    <ReadQQEmail v-model:reload="reload" v-if="emailbox === 'https://mail.qq.com'" />
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import Svg from '@/components/svg/Svg.vue'
import ReadAliyunEmail2 from '@/components/aliyun/ReadAliyunEmail2.vue'
import ReadQQEmail from '@/components/qq/ReadQQEmail.vue'

const emailbox = ref('https://mail.aliyun.com')
const reload = ref(true)

const filterEmails = ref([] as string[])
const handleChange = (emails: string[]) => {
  filterEmails.value = emails
  console.log('handleChange filterEmails :', filterEmails.value)
}
const options = ref([
  {
    value: 'https://mail.aliyun.com',
    label: '阿里云邮箱',
    icon: 'assets/aliyun.svg',
    disabled: false
  },
  {
    value: 'https://mail.qq.com',
    label: 'QQ邮箱',
    icon: 'assets/qq.svg',
    disabled: false
  }
])

onMounted(async () => {
  loadOptions()
})

const loadEmail = () => {
  console.log('LoadEmail For: ', emailbox.value)
  //重新加载开关
  reload.value = !reload.value

  //保存配置项
  saveOptions()
}

//保存配置项
const saveOptions = () => {
  console.log('saveOptions start.')
  chrome.storage.sync.set(
    {
      options: {
        emailbox: emailbox.value,
        filterEmails: filterEmails.value.join(',')
      }
    },
    function () {
      console.log('saveOptions success.')
    }
  )
}

//加载配置项
const loadOptions = () => {
  console.log('loadOptions start.')
  chrome.storage.sync.get('options', function (data) {
    if (!data.options) {
      console.log('loadOptions empty.')
      return
    }
    console.log('loadOptions data:', data)

    if (data.options.emailbox) {
      emailbox.value = data.options.emailbox
    }
    if (data.options.filterEmails) {
      filterEmails.value = data.options.filterEmails.split(',')
    }
    if (emailbox.value && filterEmails.value) {
      //加载邮件
      loadEmail()
    }
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

//重新登录
const reLogin = () => {
  let domain = getDomainFromUrl(emailbox.value)
  console.log('resetCookies for: ', domain)
  //清理 Cookies
  chrome.runtime.sendMessage({ action: 'ClearCookies', domain: domain }, (response: any) => {
    if (response) {
      console.log('ClearCookies successfully!')
    } else {
      console.log('ClearCookies failed.')
    }
  })
  //跳转登录页面
  sleep(300).then(() => {
    window.open(emailbox.value, '_blank')
  })
}
</script>
