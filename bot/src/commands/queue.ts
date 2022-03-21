import { t } from 'i18next';
import { CommandInteraction, Util } from 'discord.js';
import { Command } from '../command.js';

const QUEUE_DISPLAY_LIMIT = 10

export default class QueueCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

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
}
