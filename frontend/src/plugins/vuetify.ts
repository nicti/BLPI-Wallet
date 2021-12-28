import Vue from 'vue';
//@ts-ignore this is the correct ts import
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

export default new Vuetify({
    theme: { dark: true }
});