import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('neko')
    .setDescription('Fetch an image of a catgirl! Nya〜');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    let neko = await fetch("https://www.nekos.life/api/v2/img/neko");
    let { url } = await neko.json();
    interaction.followUp({ files: [url] });
}

