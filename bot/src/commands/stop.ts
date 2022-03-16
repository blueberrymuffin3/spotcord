import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';


export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription(t('command.stop.description'))

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

    subscription.stop()
    await interaction.reply(t('command.stop.response'))
}

