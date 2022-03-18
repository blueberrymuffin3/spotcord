import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Util } from 'discord.js';
import { getSubscription } from '../music/subscription.js';

const QUEUE_DISPLAY_LIMIT = 10

export const data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription(t('command.queue.description'))

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
        await interaction.reply(t('command.queue.response.empty'))
    } else {
        let response = ''
        for (const [i, track] of subscription.queue.entries()) {
            if (i >= QUEUE_DISPLAY_LIMIT) break;
            response += t('command.queue.response.line', {
                index: i + 1,
                ...track.info
            }) + '\n'
        }

        response = Util.escapeCodeBlock(response)
        response = '```\n' + response + '```\n'

        if (subscription.queue.length > QUEUE_DISPLAY_LIMIT) {
            response += t('command.queue.response.more', { count: subscription.queue.length - QUEUE_DISPLAY_LIMIT })
        }

        await interaction.reply(response)
    }
}

