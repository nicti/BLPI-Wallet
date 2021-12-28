import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import axios from './plugins/axios'
import { AxiosInstance } from 'axios'
import VueRouter from 'vue-router'

Vue.config.productionTip = false
Vue.prototype.$http = axios

declare module 'vue/types/vue' {
  interface Vue {
    $http: AxiosInstance,
    $router: VueRouter
  }
}

new Vue({
  // @ts-ignore
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')