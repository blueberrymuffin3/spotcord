import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';

export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription(t('command.skip.description'))

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

    // Automatically plays the next song
    subscription.audioPlayer.stop()
    await interaction.reply(t('command.skip.response'))
}
