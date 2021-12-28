<template>
    <v-app>
        <v-app-bar
            app
            color="secondary"
        >
            <div class="d-flex align-center">
                <v-img class="shrink mt-2 mb-2" width="60" contain :src="require('./assets/blpi.png')"/>
                <p class="mt-3 mr-1" style="font-size: 20px">Relay</p>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon v-on:click="toggle_dark_mode">
                <v-icon>mdi-theme-light-dark</v-icon>
            </v-btn>
            <v-divider vertical  v-if="this.userId" />
            <v-avatar size="36" class="ml-2"  v-if="this.userId">
                <v-img :src="getAvatar(userId)" />
            </v-avatar>
            <a :href="this.loginUrl">
                <v-avatar size="36" style="font-weight: bold;" color="grey" v-if="this.userId">+</v-avatar>
            </a>
            <v-btn icon :href="beUrl+'/logout'" v-if="this.userId">
                <v-icon>mdi-logout</v-icon>
            </v-btn>
        </v-app-bar>
        <v-main>
            <router-view></router-view>
        </v-main>
        <v-dialog
            v-model="displayLogin"
            width="300"
            persistent
        >
            <v-card>
                <v-card-title class="headline">
                    Login
                </v-card-title>
                <div class="d-flex justify-center" style="padding-bottom: 15px;">
                    <a :href="loginUrl">
                        <v-img :src="require('./assets/sso-login.png')" max-width="270"/>
                    </a>
                </div>
            </v-card>
        </v-dialog>
    </v-app>
</template>

<style>
.plus {
    width: 190px;
}
.plus:after {
    position: relative;
    content: '+';
    font-size: 20px;
    font-weight: bold;
    right: 10px;
    top: -3px;
}
</style>

<script>
import axios from 'axios'
import Vue from 'vue'
export default Vue.extend({
    name: 'App',
    components: {},
    data: () => ({
        displayLogin: false,
        loginUrl: process.env.VUE_APP_AUTH_URL,
        beUrl: process.env.VUE_APP_API_URL,
        userId: null
    }),
    methods: {
        toggle_dark_mode: function () {
            this.$vuetify.theme.dark = !this.$vuetify.theme.dark
            localStorage.setItem('dark_theme', this.$vuetify.theme.dark.toString())
        },
        getAvatar(userId) {
            return "https://images.evetech.net/characters/"+userId+"/portrait?size=64"
        }
    },
    mounted () {
        const theme = localStorage.getItem('dark_theme')
        if (theme) {
            this.$vuetify.theme.dark = theme === 'true'
        }
        axios.get(this.beUrl, { withCredentials: true })
            .then((response) => {
                this.userId = response.data.user.id
                axios.get(this.beUrl+'/characters', {withCredentials: true}).then((response) => {
                    this.characterIds = response.data
                })
            })
            .catch((error) => {
                if (!error.response) {
                    alert('API unreachable!')
                    return
                }
                if (error.response.status === 401 || error.response.status === 404) {
                    if (this.$route.fullPath !== '/') {
                        window.location.href = '/'
                        this.displayLogin = true
                    } else {
                        this.displayLogin = true
                    }
                } else {
                    console.log(error)
                }
                this.userId = false
            })
    }
})
</script>