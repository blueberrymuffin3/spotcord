import { CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';
import { Command } from '../command.js';

export default class NekoCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        await interaction.deferReply()
        let neko = await fetch("https://www.nekos.life/api/v2/img/neko")
        let { url } = await neko.json()
        await interaction.followUp({ files: [url] })
    }
}
