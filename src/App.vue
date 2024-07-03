<template>
  <a-button type="primary" size="middle" @click="openOptions">邮件助手</a-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
function openOptions() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }, function (tab) {
    console.log('open new tab options.html')
  })
  // window.open('options.html', '_blank')
}
</script>

<style scoped></style>
