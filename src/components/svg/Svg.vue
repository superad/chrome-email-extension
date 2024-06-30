<template>
  <div class="svg">
    <img
      :src="option.src"
      :alt="option.alt"
      :width="option.width"
      :height="option.height"
      v-if="!fallback"
      @error="handleError"
    />
    <QuestionCircleTwoTone v-if="fallback" :width="option.width" :height="option.height" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, type PropType } from 'vue'
import { QuestionCircleTwoTone } from '@ant-design/icons-vue'

interface Option {
  src?: string
  width?: string | number
  height?: string | number
  alt?: string
}

const props = defineProps({
  option: {
    type: {} as PropType<Option>,
    required: true
  }
})
const fallback = ref(false)
const option = ref<Option>({})

onMounted(() => {
  updateOptions(props.option)
})

const updateOptions = (newOption: Option) => {
  option.value.src = newOption.src
  option.value.width = newOption.width ? newOption.width : '32px'
  option.value.height = newOption.height ? newOption.height : '32px'
  option.value.alt = newOption.alt ? newOption.alt : ''
}

function handleError() {
  fallback.value = true
}
</script>

<style scoped>
.svg {
  justify-content: center;
  align-items: center;
}
</style>
