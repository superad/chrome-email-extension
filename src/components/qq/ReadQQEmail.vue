<template>
  <div>
    <input
      type="hidden"
      :value="reload"
      @input="emit('update:reload', ($event.target as HTMLInputElement).value)"
    />
    <a-alert v-if="visible" message="QQ邮件加载中..." type="success" show-icon closable />
  </div>
</template>

<script setup lang="ts" name="ReadQQEmail">
import { ref, watch } from 'vue'
import createAxiosInstance from '@/axiosConfig'
const baseURL = ref('https://mail.qq.com')

//1s自动关闭
const visible = ref<boolean>(true)

const props = defineProps(['reload'])
const emit = defineEmits(['update:reload'])
watch(
  () => props.reload,
  () => {
    console.log('reload email: ', props.reload)
    //显示加载
    visible.value = true
    setTimeout(() => {
      visible.value = false
    }, 1000)

    // getCookies()
  },
  //首次加载,直接生效
  { immediate: true }
)
</script>

<style lang="scss" scoped></style>
