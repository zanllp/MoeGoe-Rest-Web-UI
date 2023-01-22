import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import Antd from 'ant-design-vue';
import 'antd-vue-volar'
import 'ant-design-vue/es/message/style/css'
// import 'ant-design-vue/es/notification/style/css'
// import 'ant-design-vue/es/modal/style/css'

const app = createApp(App).use(Antd)
app.mount('#app')
