import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getSubscription } from '../music/subscription.js';


export const data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Stop playing music and leave the voice channel')

export async function execute(interaction: CommandInteraction) {
    if(!interaction.guildId) return;

    let subscription = getSubscription(interaction.guildId)
    if(!subscription){
        await interaction.reply({content: "Not currently playing anything", ephemeral: true})
        return
    }

    subscription.voiceConnection.destroy()
    await interaction.reply("Goodbye!")
}

