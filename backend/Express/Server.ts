import express = require('express')
import {Express} from "express";
const cookieSession = require('cookie-session')
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as passport from 'passport'
import * as cookieParser from 'cookie-parser'
import strategy from "../Auth/Strategy";
import * as mysql from "mysql2";
strategy()

export default class Server {

    private readonly port: number|null = null
    private express: Express

    constructor(port: number) {
        this.port = port
        this.express = express()
        this.express.use(bodyParser.json())
        this.express.use(cors({
            origin: 'http://localhost:8080',
            credentials: true
        }))
        this.express.use(cookieSession({
            name: 'session',
            keys: [process.env.SESSION_SECRET as string],
            maxAge: 24 * 60 * 60 * 1000
        }))
        this.express.use(cookieParser())
        this.express.use(passport.initialize())
        this.express.use(passport.session())


        //Auth
        this.express.get('/api/esi/callback', passport.authenticate('eveOnline',
            {
                successRedirect: process.env.BASE_URL,
                failureRedirect: process.env.BASE_URL
            })
        )
        this.express.get('/api/esi', (req, res, next) => {
            passport.authenticate('eveOnline')(req, res, next)
        })
        this.express.get('/api/logout', (req, res, next) => {
            req.logout()
            res.redirect(process.env.BASE_URL)
        })
        const authenticationCheck = (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    authenticated: false,
                    message: 'Not authenticated'
                })
            } else next()
        }
        this.express.get('/api', authenticationCheck, (req, res) => {
            res.status(200).json({
                authenticated: true,
                message: 'Authenticated',
                user: req.user,
                cookies: req.cookies
            })
        })
        this.express.get('/api/characters', authenticationCheck, (req, res) => {
            let connection = mysql.createConnection({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASS,
                database: process.env.MYSQL_DATA
            })
            // @ts-ignore
            connection.query({sql: `SELECT id FROM users WHERE id = ${req.user.id} OR parent_id = ${req.user.id}`, rowsAsArray: true}, (error, results) => {
                if (error) throw error
                res.json(results)
            })
        })

        
        
        this.express.listen(this.port, () => {
            console.log(`Listening to port ${this.port}`)
        })
    }

}