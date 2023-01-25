import axios from 'axios'
interface TTSVoiceGenerateSpecifyModelParams {
  model_path: string
  conf_text: string
  speaker_id: number
  text: string
}
export interface TTSVoiceGeneratePretrainModelParams {
  pretrained_model: string
  speaker_id: number
  text: string
}
export type TTSVoiceGenerateParams = TTSVoiceGeneratePretrainModelParams | TTSVoiceGenerateSpecifyModelParams
export const generateTTSVoice = async (body: TTSVoiceGenerateParams) => {
  return (await axios.post(`/tts`, body)).data as { path: string, url: string }
}

export type PretrainedModel = {
  name: string
  speakers: string[]
  data: {
    text_cleaners: ['cjks_cleaners'] | ['japanese_cleaners']
  }
}

export const listPretrainedModels = async () => {
  return (await axios.get(`/tts/pretrained-models`)).data as PretrainedModel[]
}
