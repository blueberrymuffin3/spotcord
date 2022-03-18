import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Util } from 'discord.js';
import { getSubscription } from '../music/subscription.js';

const QUEUE_DISPLAY_LIMIT = 10

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription(t('command.clear.description'))

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;

    let subscription = getSubscription(interaction.guildId)
    if (!subscription) {
        await interaction.reply({
            content: t('error.bot_not_connected'),
            ephemeral: true
        })
        return
    }

    if (subscription.queue.length == 0) {
        await interaction.reply(t('command.clear.response.empty'))
    } else {
        subscription.queue = []

        await interaction.reply(t('command.clear.response.success'))
    }
}

