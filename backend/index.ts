import Server from './Express/Server'
import { config } from 'dotenv-flow'

config()

const server = new Server(parseInt(process.env.HTTP_PORT));