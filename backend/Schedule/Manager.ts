import * as mysql from "mysql2/promise"
import {Connection} from "mysql2/promise"
import axios, {AxiosInstance} from 'axios'
import {GetCharactersCharacterIdWalletJournal200Ok, WalletApi} from "../API";
import {BASE_PATH} from "../API/base";

export default class Manager {
    connection: Connection | null = null
    axiosInstance: AxiosInstance

    constructor() {
        this.axiosInstance = axios.create({})
    }

    public async setup() {
        this.connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASS,
            database: process.env.MYSQL_DATA
        })
    }

    public async schedule(action: string, payload: any, scheduled_at: string | null = null) {
        if (scheduled_at === null) {
            await this.connection.query(`INSERT INTO schedule (scheduled_at, action, payload)
                                           VALUES (NOW(), '${action}', '${JSON.stringify(payload)}')`)
        }
    }

    public async execute() {
        const [results]: [results: any[], fields: any[]] = await this.connection.query('SELECT * FROM schedule WHERE scheduled_at < NOW()')
        for (let i = 0; i < results.length; i++) {
            let result: { id: number, scheduled_at: any, action: string, payload: string } = results[i]
            switch (result.action) {
                case 'updateWallet':
                    await this.updateWallet(JSON.parse(result.payload))
                    break;
                default:
                    console.error(`Unknown action: ${result.action}`)
            }
            await this.connection.query(`DELETE
                                     FROM schedule
                                     WHERE id = ${result.id}`)
        }
        await this.connection.end()
    }

    private async updateWallet(payload: any) {
        const [results]: [results: any[], fields: any[]] = await this.connection.query(`SELECT *
                                                                                          FROM users
                                                                                          WHERE id = ${payload.character_id}`)
        const result = results[0]
        let access_token = result.access_token
        let refresh_token = result.refresh_token
        const walletApi = new WalletApi(null, BASE_PATH, this.axiosInstance)
        let currentPage = 1
        try {
            let data = await walletApi.getCharactersCharacterIdWalletJournal(result.id, "tranquility", "", currentPage, access_token)
            // Process data
            await this.updateWalletData(payload.character_id, data.data)
            const pages = parseInt(data.headers['x-pages'])
            while (pages > currentPage) {
                currentPage++
                let pagedData = await walletApi.getCharactersCharacterIdWalletJournal(result.id, "tranquility", "", currentPage, access_token)
                await this.updateWalletData(payload.character_id, pagedData.data)
            }
        } catch (error) {
            if (error.hasOwnProperty('sql')) {
                console.log(error.sql)
                throw error
            }
            const {status} = error.response;
            if (status === 403) {
                // Access token expired
                const newTokens = await this.refreshTokens(refresh_token)
                // Persist this data and reschedule asap
                await this.connection.query(`UPDATE users
                                             SET access_token  = '${newTokens.access_token}',
                                                 refresh_token = '${newTokens.refresh_token}'
                                             WHERE id = ${payload.character_id}`)
                await this.schedule('updateWallet', payload)
            }
        }
    }

    private async refreshTokens(refresh_token: string): Promise<{ access_token: string, refresh_token: string }> {
        let tokens: any = {}
        let body = new URLSearchParams()
        body.append('grant_type', 'refresh_token')
        body.append('refresh_token', refresh_token)
        const response = await this.axiosInstance.post('https://login.eveonline.com/v2/oauth/token',
            body,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(process.env.ESI_CLIENT_ID + ':' + process.env.ESI_CLIENT_SECRET).toString('base64')
                }
            })
        tokens.access_token = response.data.access_token
        tokens.refresh_token = response.data.refresh_token

        return tokens
    }

    private async updateWalletData(character_id: number, dataArray: GetCharactersCharacterIdWalletJournal200Ok[]) {
        let values = []
        for (let i = 0; i < dataArray.length; i++) {
            let data: GetCharactersCharacterIdWalletJournal200Ok = dataArray[i]
            let date = new Date(data.date)
            values.push([
                data.id,
                character_id??null,
                data.amount??null,
                data.balance??null,
                data.context_id??null,
                data.context_id_type??null,
                Manager.getUTCMysqlDate(date)??null,
                data.description??null,
                data.first_party_id??null,
                data.reason??null,
                data.ref_type??null,
                data.second_party_id??null,
                data.tax??null,
                data.tax_receiver_id??null
            ])
        }
        await this.connection.query('INSERT IGNORE INTO wallet_journal (id, user_id, amount, balance, context_id, context_id_type, date, description, first_party_id, reason, ref_type, second_party_id, tax, tax_receiver_id) VALUES ?', [values])
    }

    private static getUTCMysqlDate(date: Date) {
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`
    }
}