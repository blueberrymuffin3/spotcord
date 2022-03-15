import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription(t('command.ping.description'));

export async function execute(interaction: CommandInteraction) {
    await interaction.reply(t('command.ping.response'));
}

