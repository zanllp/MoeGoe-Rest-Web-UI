<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import { generateTTSVoice, TTSVoiceGeneratePretrainModelParams, PretrainedModel, listPretrainedModels } from '@/api/tts'
import { SearchSelect } from 'vue3-ts-util'
import { message } from 'ant-design-vue'

type GenerateParamsWithVersion = TTSVoiceGeneratePretrainModelParams & { version: number }
const currVersion = 1
const pretrainModels = ref<PretrainedModel[]>([])
const formRef = ref<{ validate (): Promise<void> }>()
const textInputRef = ref<any>()
const loading = ref(false)
const form = ref<GenerateParamsWithVersion>({
  pretrained_model: '',
  speaker_id: null as unknown as number,
  text: 'Ciallo～(∠・ω< )',
  version: currVersion
})
const mp3 = ref('')
const TTSVoiceGenerateParamsKey = 'TTSVoiceGenerateParams'

const speakerOptions = computed(() => {
  const speakers = pretrainModels.value.find(v => v.name === form.value.pretrained_model)?.speakers ?? []
  return speakers.map((name, idx) => ({ name, id: idx }))
})

onMounted(() => {
  listPretrainedModels().then(v => {
    pretrainModels.value = v
  })
  const res = localStorage.getItem(TTSVoiceGenerateParamsKey)
  if (res) {
    const val = JSON.parse(res) as GenerateParamsWithVersion
    if (val.version === currVersion) {
      form.value = val
    }
  }
})
const submit = async () => {
  await formRef.value?.validate()
  loading.value = true
  try {
    localStorage.setItem(TTSVoiceGenerateParamsKey, JSON.stringify(toRaw(form.value)))
    const { url } = await generateTTSVoice({ ...form.value, text: form.value.text.replace(/\n/g, ' ') })
    mp3.value = url
  } finally {
    loading.value = false
  }
}

const markSelectedText = (lang: 'ZH' | 'JA' | 'EN') => {
  const el = textInputRef.value.resizableTextArea.textArea as HTMLInputElement
  const { selectionStart: start, selectionEnd: end } = el
  if (!(typeof start === 'number' && typeof end === 'number') || start === end) {
    message.error('需要选中分区')
    return
  }
  const tag = `[${lang}]`
  const textRaw = form.value.text
  const res = textRaw.substring(0, start) + tag + textRaw.substring(start, end) + tag + textRaw.substring(end)
  form.value.text = res
}

const clearTextMark = () => {
  form.value.text = form.value.text.replace(/\[((EN)|(ZH)|(JA))\]/g, '')
}
</script>

<template>
  <a-select v-if="false" />
  <a-form class="form" ref="formRef" :model="form">
    <a-form-item required name="pretrained_model" label="预训练模型">
      <search-select v-model:value="form.pretrained_model" :conv="{ text: v => v.name, value: v => v.name }"
        :options="pretrainModels" />
    </a-form-item>
    <a-form-item label="输入文本" required name="text">
      <a-textarea auto-size v-model:value="form.text" ref="textInputRef">

      </a-textarea>
      <div class="text-toolbar">

        <div class="mark-as">
          标记选中为
          <a-button size="small" @click="markSelectedText('ZH')">
            中
          </a-button>
          <a-button size="small" @click="markSelectedText('JA')">
            日
          </a-button>
          <a-button size="small" @click="markSelectedText('EN')">
            英
          </a-button>
        </div>
        <div class="flex-placeholder"></div>
        <a-button size="small" @click="clearTextMark">
          清理所有标记
        </a-button>
      </div>
    </a-form-item>
    <a-form-item required name="speaker_id" label="说话人">
      <search-select :as-null-values="[]" v-model:value="form.speaker_id"
        :conv="{ text: v => v.name, value: v => v.id }" :options="speakerOptions" placeholder="若列表为空，先选择模型" />
    </a-form-item>
    <a-form-item>
      <a-button @click="submit" :loading="loading" type="primary">
        提交
      </a-button>
    </a-form-item>
    <audio v-if="mp3" controls :src="mp3">
    </audio>
  </a-form>
</template>

<style scoped lang="scss">
.flex-placeholder {
  flex: 1;
}

.form {

  .json-preview {
    max-height: 256px;
    overflow: auto;
    font-family: Consolas, Menlo, monospace;
    font-size: 12px;
    background-color: rgba(17, 206, 153, 0.05);
    padding: 8px;
    border-radius: 4px;
    color: black;
  }

  .text-toolbar {

    display: flex;
    align-items: center;

    .mark-as {
      margin-top: 4px;
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background-color: #eee;
      border-radius: 50vw;

      &>* {
        margin-left: 4px;
      }
    }
  }
}
</style>
