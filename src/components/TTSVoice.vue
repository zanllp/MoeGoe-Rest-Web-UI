<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { generateTTSVoice, TTSVoiceGeneratePretrainModelParams, PretrainedModel, listPretrainedModels } from '@/api/tts'
import { FetchQueue, ok, SearchSelect, SplitView } from 'vue3-ts-util'
import { message } from 'ant-design-vue'

type GenerateParamsWithVersion = TTSVoiceGeneratePretrainModelParams & { version: number }
const currVersion = 1.1
const pretrainModels = ref<PretrainedModel[]>([])
const formRef = ref<{ validate (): Promise<void> }>()
const textInputRef = ref<any>()
const player = ref<HTMLAudioElement>()
const form = ref<GenerateParamsWithVersion>({
  pretrained_model: '',
  speaker_id: null as unknown as number,
  text: 'Ciallo～(∠・ω< )',
  version: currVersion
})
type Lang = 'ZH' | 'JA' | 'EN'
const langColorMap: Record<Lang, string> = {
  ZH: '#f5222d',
  JA: '#9254de',
  EN: '#13c2c2'
}

const chunkedVoices = ref<string[]>([])
const currChunkedIdx = ref(-1)
const mp3 = computed(() => chunkedVoices.value[currChunkedIdx.value])
const queue = reactive(new FetchQueue(1))
const TTSVoiceGenerateParamsKey = 'TTSVoiceGenerateParams'
const selectedPretrainedModel = computed(() => pretrainModels.value.find(v => v.name === form.value.pretrained_model))
const isPureJp = computed(() => selectedPretrainedModel.value?.data.text_cleaners[0] === 'japanese_cleaners')
const speakerOptions = computed(() => {
  const speakers = selectedPretrainedModel.value?.speakers ?? []
  return speakers.map((name, idx) => ({ name, id: idx }))
})

const longTextSplitReg = /[\n?,.，『』（）()、」「。……─？!？！]/
type LongTextGroup = { text: string, lang: Lang, raw: string }
const longTextGroup = computed<LongTextGroup[]>(() => {
  let { text } = form.value
  const reg = /(?:\[ZH\](.+)\[ZH\])|(?:\[EN\](.+)\[EN\])|(?:\[JA\](.+)\[JA\])/sg
  const list = new Array<LongTextGroup>()
  let regRes: RegExpExecArray | null = null
  const splitLongTxt = (text: string, lang: Lang) => text
    .split(longTextSplitReg)
    .map(v => v.trim())
    .filter(v => v)
    .map<LongTextGroup>(v => ({ text: isPureJp.value ? v : `[${lang}]${v}[${lang}]`, raw: v, lang }))
  if (isPureJp.value) {
    return splitLongTxt(text, 'JA')
  }
  while (regRes = reg.exec(text)) {
    const [_, zh, en, ja] = regRes
    if (zh) {
      list.push(...splitLongTxt(zh, 'ZH'))
    } else if (en) {
      list.push(...splitLongTxt(en, 'EN'))
    } else if (ja) {
      list.push(...splitLongTxt(ja, 'JA'))
    }
  }
  return list
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
  localStorage.setItem(TTSVoiceGenerateParamsKey, JSON.stringify(toRaw(form.value)))
  currChunkedIdx.value = 0
  chunkedVoices.value = []
  longTextGroup.value.map(v => {
    queue.pushAction(() => generateTTSVoice({ ...form.value, ...v })).res.then(v => {
      chunkedVoices.value.push(v.url)
    })
  })
}

const stop = () => {
  queue.tasks.forEach(v => v.cancel())
  player.value?.pause()
  currChunkedIdx.value = -1
}

const markSelectedText = (lang: Lang) => {
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

const onCellClick = (idx: number) => {
  const target = chunkedVoices.value[idx]
  if (target) {
    currChunkedIdx.value = idx
  } else {
    message.warning('还未生成')
  }
}
</script>

<template>
  <a-select v-if="false" />
  <split-view class="container">
    <template #left>
      <a-form class="form" ref="formRef" :model="form">
        <a-form-item required name="pretrained_model" label="预训练模型">
          <search-select v-model:value="form.pretrained_model" :conv="{ text: v => v.name, value: v => v.name }"
            :options="pretrainModels" />
        </a-form-item>
        <a-form-item label="输入文本" required name="text">

          <div class="text-toolbar" >

            <div class="mark-as" v-if="!isPureJp">
              标记选中为
              <a-button size="small" @click="markSelectedText('ZH')"
                :style="`background: ${langColorMap.ZH};color:white`">
                中
              </a-button>
              <a-button size="small" @click="markSelectedText('JA')"
                :style="`background: ${langColorMap.JA};color:white`">
                日
              </a-button>
              <a-button size="small" @click="markSelectedText('EN')"
                :style="`background: ${langColorMap.EN};color:white`">
                英
              </a-button>
            </div>
            <div class="flex-placeholder"></div>
            <a-button size="small" @click="clearTextMark">
              清理所有标记
            </a-button>
          </div>

          <div class="text-wrap">
            <a-textarea auto-size v-model:value="form.text" ref="textInputRef">

            </a-textarea>
          </div>
        </a-form-item>
        <a-form-item required name="speaker_id" label="说话人">
          <search-select :as-null-values="[]" v-model:value="form.speaker_id"
            :conv="{ text: v => v.name, value: v => v.id }" :options="speakerOptions" placeholder="若列表为空，先选择模型" />
        </a-form-item>
        <a-form-item>
          <div class="play-control-bar">

            <a-button @click="submit" :loading="!queue.isIdle" :disabled="!!player" type="primary">
              开始
            </a-button>
            <template v-if="player">
              <a-button @click="player?.paused ? player.play() : player?.pause()">
                继续 / 暂停
              </a-button>
              <a-button @click="stop">
                停止
              </a-button>
            </template>
            <span v-if="queue.tasks.length">剩余生成数量{{ queue.tasks.length }}</span>
          </div>
        </a-form-item>
        <audio hidden v-if="mp3" controls :src="mp3" @ended="currChunkedIdx += 1" autoplay
          :ref="(v: any) => player = v">
        </audio>
      </a-form>
    </template>
    <template #right>
      <div class="long-text" >
        <p><a-alert message="过长的文本将会提前进行自动分割。点击跳转到目标播放" type="info" /></p>
        <span v-for="item, idx in longTextGroup" :key="item.text" class="cell"
          :class="{ curr: idx == currChunkedIdx, ungenerated: !chunkedVoices[idx] }" @click="onCellClick(idx)"
          :style="`border-bottom: 2px solid ${langColorMap[item.lang]}`">
          {{ item.raw }}
        </span>
      </div>
    </template>
  </split-view>
</template>

<style scoped lang="scss">
.container {
  height: 100%;
  position: relative;
}

.flex-placeholder {
  flex: 1;
}

.form {
  background: #f8f8f8;
  border-radius: 16px;
  padding: 16px;
  margin: 16px;


  .text-wrap {
    position: relative;
    max-height: 50vh;
    overflow: scroll;
  }

  .play-control-bar {
    &>* {
      margin-right: 8px;
    }
  }

  .text-toolbar {
    display: flex;
    align-items: center;
    padding-bottom: 8px;
    z-index: 1;
    // background-color: white;

    .mark-as {
      margin-top: 4px;
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background-color: rgb(232, 232, 232);
      border-radius: 50vw;

      &>* {
        margin-left: 4px;
      }
    }
  }
}

.long-text {
  padding: 8px;
  margin: 8px;
  max-height: 100vh;
  overflow: scroll;

  .cell {
    margin: 4px;
    display: inline-block;
    padding: 4px;
    transition: all .7s ease;
    border-radius: 4px;
    background: #eee;
    cursor: pointer;


    &.curr {
      background: #1890ff;
      color: white;
    }

    &.ungenerated {
      cursor: wait;
      color: gray;
    }
  }
}
</style>
