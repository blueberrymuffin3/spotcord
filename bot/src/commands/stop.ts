import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { subscriptions } from '../music/subscription.js';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music')

export async function execute(interaction: CommandInteraction) {
    const subscription = subscriptions.get(interaction.guildId!)

    if (subscription == null) {
        await interaction.reply({ content: "Nothing is currently playing", ephemeral: true })
    } else {
        subscription.stop()
        await interaction.reply("The music has been stopped")
    }
}
