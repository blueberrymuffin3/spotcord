import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';

export const data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription(t('command.leave.description'))

export async function execute(interaction: CommandInteraction) {
    if(!interaction.guildId) return;

    let subscription = getSubscription(interaction.guildId)
    if(!subscription){
        await interaction.reply({
            content: t('error.bot_not_connected'),
            ephemeral: true
        })
        return
    }

    await subscription.deleteLastNowPlaying()
    subscription.voiceConnection.destroy()
    await interaction.reply(t('command.leave.response'))
}

