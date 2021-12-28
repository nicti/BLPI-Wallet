import * as passport from "passport"
const EVEStrategy = require('passport-eve-oauth2').Strategy
//TODO: Why does this file need its own dotenv load
import { config } from "dotenv-flow"
import * as mysql from 'mysql2'
import {Request} from "express";
import {VerifyCallback} from "passport-oauth2";
import Manager from "../Schedule/Manager";
config()

export default function () {
    const scheduleManager = new Manager()
    scheduleManager.setup()
    const connection = mysql.createConnection({
        host:       process.env.MYSQL_HOST,
        user:       process.env.MYSQL_USER,
        password:   process.env.MYSQL_PASS,
        database:   process.env.MYSQL_DATA
    })
    connection.connect()

    passport.serializeUser((user: {id: number, name: string, parent_id: number}, done) => {
        if (user.parent_id !== null) {
            done(null, user.parent_id)
        } else {
            done(null, user.id)
        }
    })

    passport.deserializeUser(async (id, done) => {
        connection.query(`SELECT * FROM users WHERE id = ${id}`, (error, results, fields) => {
            if (error) throw error
            if ("length" in results && results.length > 0) {
                done(null, results[0])
            } else {
                done(null, null)
            }
        })
    })


    passport.use(new EVEStrategy({
        clientID: process.env.ESI_CLIENT_ID as string,
        clientSecret: process.env.ESI_CLIENT_SECRET as string,
        callbackURL: process.env.ESI_CALLBACK_URL as string,
        state: Math.random().toString(36).substring(7),
        passReqToCallback: true,
        scope: 'esi-wallet.read_character_wallet.v1 esi-industry.read_character_mining.v1'
    }, (req: Request, accessToken: string, refreshToken: string, results: any, profile: any, verified: VerifyCallback) => {
        connection.query(`SELECT * FROM users WHERE id = ${profile.CharacterID}`, (error, results, fields) => {
            if (error) throw error
            if ("length" in results && results.length > 0) {
                verified(null, results[0])
            } else {
                let parent_id = null
                if (req.user) {
                    // @ts-ignore
                    parent_id = req.user.id
                }
                connection.query(`INSERT INTO users (id, parent_id, name, access_token, refresh_token) VALUES (${profile.CharacterID}, ${parent_id}, '${profile.CharacterName}', '${accessToken}', '${refreshToken}')`,(error, results) => {
                    if (error) throw error
                    scheduleManager.schedule('updateWallet',{character_id: profile.CharacterID})
                    if (parent_id === null) {
                        connection.query(`SELECT * FROM users WHERE id = ${profile.CharacterID}`, (error, results, fields) => {
                            if (error) throw error
                            if ("length" in results && results.length > 0) {
                                verified(null, results[0])
                            }
                        })
                    } else {
                        connection.query(`SELECT * FROM users WHERE id = ${parent_id}`, (error, results, fields) => {
                            if (error) throw error
                            if ("length" in results && results.length > 0) {
                                verified(null, results[0])
                            }
                        })
                    }
                })
            }
        })
    }))
}