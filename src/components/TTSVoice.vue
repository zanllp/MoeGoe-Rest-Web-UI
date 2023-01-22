<script setup lang="ts">
import { onMounted, reactive, ref, toRaw } from 'vue'
import { generateTTSVoice, TTSVoiceGenerateParams } from '@/api/tts'
import { SearchSelect, ok } from 'vue3-ts-util'
import { InboxOutlined } from '@ant-design/icons-vue'; import { message, UploadProps } from 'ant-design-vue'


const fileList = ref<UploadProps['fileList']>([])
const speakers = ref<string[]>([])
const formRef = ref<{ validate (): Promise<void> }>()
const textInputRef = ref<any>()
const form = ref<TTSVoiceGenerateParams>({
  model_path: '',
  conf_text: '',
  speaker_id: null as unknown as number,
  text: 'Ciallo～(∠・ω< )'
})

const mp3 = ref('')

const TTSVoiceGenerateParamsKey = 'TTSVoiceGenerateParams'

onMounted(() => {
  const res = localStorage.getItem(TTSVoiceGenerateParamsKey)
  if (res) {
    form.value = JSON.parse(res)
    speakers.value = JSON.parse(form.value.conf_text).speakers ?? []
  }
})
const loading = ref(false)
const submit = async () => {
  await formRef.value?.validate()
  loading.value = true
  try {
    localStorage.setItem(TTSVoiceGenerateParamsKey, JSON.stringify(toRaw(form.value)))
    const { path } = await generateTTSVoice(form.value)
    mp3.value = `/tts-res-static/${path}`
  } finally {
    loading.value = false
  }
}
const beforeUpload = async (file: File) => {
  try {
    const txt = await file.text()
    const { speakers: speakersIn } = JSON.parse(txt)
    ok(speakersIn instanceof Array)
    speakers.value = speakersIn
    form.value.conf_text = txt
  } catch (error) {
    message.error('不是合法的json配置文本')
  }

  return false
}

const markSelectedText = (lang: 'ZH' | 'JA' | 'EN') => {
  const el = textInputRef.value.resizableTextArea.textArea as HTMLInputElement
  const { selectionStart: start, selectionEnd: end } = el
  if (!(typeof start === 'number' &&  typeof end === 'number') || start === end) {
    message.error('需要选中分区')
    return
  }
  const tag = `[${lang}]`
  const textRaw = form.value.text
  const res = textRaw.substring(0, start) + tag + textRaw.substring(start, end) + tag + textRaw.substring(end)
  form.value.text = res
}

const clearTextMark = () => {
  form.value.text = form.value.text.replace(/\[((EN)|(ZH)|(JA))\]/g,'')
}
</script>

<template>
  <a-select v-if="false" />
  <a-form class="form" ref="formRef" :model="form">
    <a-form-item label="输入文本" required name="text">
      <a-textarea auto-size v-model:value="form.text" ref="textInputRef">

      </a-textarea>
      <div class="mark-as">
        标记为
        <a-button size="small" @click="markSelectedText('ZH')">
          中
        </a-button>
        <a-button size="small" @click="markSelectedText('JA')">
          日
        </a-button>
        <a-button size="small" @click="markSelectedText('EN')">
          英
        </a-button>
        <div class="flex-placeholder"></div>
        <a-button size="small" @click="clearTextMark">
          清理所有标记
        </a-button>
      </div>
    </a-form-item>
    <a-form-item label="模型地址" required name="model_path">
      <a-input v-model:value="form.model_path"></a-input>
    </a-form-item>
    <a-form-item label="配置文件" required name="conf_text">
      <div v-if="form.conf_text">

        <pre class="json-preview">{{ form.conf_text }}</pre>
        <a-button @click="form.conf_text = ''">重新上传</a-button>
      </div>
      <a-upload-dragger v-else :file-list="fileList" :before-upload="beforeUpload">
        <p class="ant-upload-drag-icon">
          <inbox-outlined></inbox-outlined>
        </p>
        <p class="ant-upload-text">点击或拖拽文件到这里以上传</p>
      </a-upload-dragger>
    </a-form-item>
    <a-form-item required name="speaker_id" label="说话人">
      <search-select :as-null-values="[]" v-model:value="form.speaker_id" :conv="{ text: v => v.v, value: v => v.idx }"
        :options="speakers.map((v, idx) => ({ v, idx }))" placeholder="若列表为空，先上传配置文件" />
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
  width: 100%;
  padding: 16px;

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

  .mark-as {
    margin-top: 4px;
    display: flex;
    align-items: center;
    & > * {
      margin-right: 4px;
    }
  }
}
</style>
