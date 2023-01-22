import axios from 'axios'

export interface TTSVoiceGenerateParams {
  model_path: string
  conf_text: string
  speaker_id: number
  text: string
}
export const generateTTSVoice = async (body: TTSVoiceGenerateParams) => {
  return (await axios.post(`/tts`, body)).data as { path: string }
}
