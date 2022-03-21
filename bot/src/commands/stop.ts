import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

export default class StopCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        subscription.stop()
        await interaction.reply(t('command.stop.response'))
    }
}
