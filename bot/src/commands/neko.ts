import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('neko')
    .setDescription(t('command.neko.description'));

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    let neko = await fetch("https://www.nekos.life/api/v2/img/neko");
    let { url } = await neko.json();
    interaction.followUp({ files: [url] });
}

