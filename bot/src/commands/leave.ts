import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

export default class LeaveCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        await subscription.deleteLastNowPlaying()
        subscription.voiceConnection.destroy()
        await interaction.reply(t('command.leave.response'))
    }
}

