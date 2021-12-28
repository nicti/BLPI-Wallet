import Manager from "./Schedule/Manager";
import {config} from 'dotenv-flow'
config()

const manager = new Manager()
manager.setup().then(() => {
    manager.execute()
})