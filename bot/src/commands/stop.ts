import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';


export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the currently playing music')

export async function execute(interaction: CommandInteraction) {
    if(!interaction.guildId) return;

    let subscription = getSubscription(interaction.guildId)
    if(!subscription){
        await interaction.reply({content: "Not currently playing anything", ephemeral: true})
        return
    }

    subscription.stop()
    await interaction.reply("The music has been stopped")
}

