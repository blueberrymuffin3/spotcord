import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';


export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current song')

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;

    let subscription = getSubscription(interaction.guildId)
    if (!subscription) {
        await interaction.reply({ content: "Not currently playing anything", ephemeral: true })
        return
    }

    // Automatically plays the next song
    subscription.audioPlayer.stop()
    await interaction.reply("Song skipped!")
}
