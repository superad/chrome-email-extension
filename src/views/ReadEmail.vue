<template>
  <a-flex justify="space-between">
    <!-- <a-space style="gap: 8px; margin: 10px 5px"> -->
    <a-space-compact block size="middle" style="margin: 10px 5px">
      <a-select
        v-model:value="value"
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
      <a-button type="primary" size="middle" @click="loadEmail">加载邮件</a-button>
    </a-space-compact>

    <a-button style="margin: 10px 5px" type="link" size="middle" @click="reLogin"
      >重新登录</a-button
    >
  </a-flex>
  <div style="margin: 8px 5px">
    <ReadAliyunEmail
      v-model:reload="reloadFlag"
      v-if="selectedEmail === 'https://mail.aliyun.com'"
    />
    <ReadQQEmail v-model:reload="reloadFlag" v-if="selectedEmail === 'https://mail.qq.com'" />
  </div>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue'
import Svg from '@/components/svg/Svg.vue'
import ReadAliyunEmail from '@/components/aliyun/ReadAliyunEmail.vue'
import ReadQQEmail from '@/components/qq/ReadQQEmail.vue'

const value = ref('https://mail.aliyun.com')
const selectedEmail = ref('')
const reloadFlag = ref(true)

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
watch(value, (val) => {
  console.log(`selected:`, val)
})

const loadEmail = () => {
  console.log('LoadEmail For: ', value.value)
  selectedEmail.value = value.value
  //重新加载开关
  reloadFlag.value = !reloadFlag.value
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
  let domain = getDomainFromUrl(value.value)
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
    window.open(value.value, '_blank')
  })
}
</script>
