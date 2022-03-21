import { readdir } from 'node:fs/promises';
import { basename } from 'node:path'
import { Command } from './command.js';

const SlashCommands = new Map<string, Command>()
const SelectMenuCommands = new Map<string, Command>();

let commandFiles = await readdir('./dist/commands');
commandFiles = commandFiles.filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
    const path = `./commands/${file}`
    const name = basename(file, '.js')

    console.log(`Loading "/${name}" from ${path}`)

    const builder: new (name: string) => Command = (await import(path)).default;
    const command = new builder(name)

    SlashCommands.set(name, command)
    for (const interactionId of command.selectMenuCustomIds) {
        SelectMenuCommands.set(interactionId, command)
    }
}

export { SlashCommands, SelectMenuCommands }
