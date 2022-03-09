import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, Message, MessageActionRow, MessageSelectMenu, SelectMenuInteraction, Util } from 'discord.js';
import { formatDurationMs, formatPlural, truncateEllipses } from '../util.js';
import { decode as decodeEntity } from 'html-entities';
import { Track } from '../music/track.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getSubscription } from '../music/subscription.js';
import * as spotify from '../spotify-api.js';

const customIdSelectSearchResultTrack = "select_search_result_track";
const customIdSelectSearchResultAlbum = "select_search_result_album";
const customIdSelectSearchResultPlaylist = "select_search_result_playlist";
const EMOJI_TRACk = "%F0%9F%8E%B5"; // :musical_note:
const EMOJI_ALBUM = "%F0%9F%92%BD"; // :minidisk:
const EMOJI_PLAYLIST = "%F0%9F%93%9C"; // :scroll:
const TRUNCATE_LENGTH = 50
const TRUNCATE_LENGTH_LONG = 100

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from spotify')
    .addStringOption(option => option.setName('query')
        .setDescription('Song to search for, or a spotify URL')
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    let query = interaction.options.getString("query") as string
    let results = await spotify.search(query)

    const menus: MessageSelectMenu[] = []

    if (results.tracks!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultTrack)
            .setPlaceholder(`${formatPlural(results.tracks!.total, 'tracks', 'track')} found`)
            .addOptions(results.tracks!.items.map(track => {
                let artists = track.artists
                    .map(artist => artist.name)
                    .join(', ')

                let explicit = track.explicit ? '[explicit] ' : ''
                let duration = formatDurationMs(track.duration_ms)

                return {
                    label: `${truncateEllipses(track.name, TRUNCATE_LENGTH - 8)} [${duration}]`,
                    description: truncateEllipses(`${explicit}${artists}`, TRUNCATE_LENGTH_LONG),
                    value: track.id,
                    emoji: EMOJI_TRACk
                }
            }))
        )
    }

    if (results.albums!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultAlbum)
            .setPlaceholder(`${formatPlural(results.albums!.total, 'albums', 'album')} found`)
            .addOptions(results.albums!.items.map(album => {
                let artists = album.artists
                    .map(artist => artist.name)
                    .join(', ')

                return {
                    label: `${truncateEllipses(album.name, TRUNCATE_LENGTH - 11)} [${formatPlural(album.total_tracks, 'tracks', 'track')}]`,
                    description: truncateEllipses(artists, TRUNCATE_LENGTH_LONG),
                    value: album.id,
                    emoji: EMOJI_ALBUM
                }
            }))
        )
    }

    if (results.playlists!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultPlaylist)
            .setPlaceholder(`${formatPlural(results.playlists!.total, 'playlists', 'playlist')} found`)
            .addOptions(results.playlists!.items.map(playlist => {
                let description = playlist.description || ''
                description = decodeEntity(description, { scope: 'strict' })
                description = truncateEllipses(description, TRUNCATE_LENGTH_LONG)

                return {
                    label: `${truncateEllipses(playlist.name, TRUNCATE_LENGTH - 11)} [${formatPlural(playlist.tracks.total, 'tracks', 'track')}]`,
                    description: description,
                    value: playlist.id,
                    emoji: EMOJI_PLAYLIST
                }
            }))
        )
    }

    if (menus.length == 0) {
        interaction.reply({
            content: `No results found for query \`${query}\``,
            ephemeral: true
        })
    } else {
        await interaction.reply({
            content: `Results found for query \`${query}\``,
            components: menus.map(menu => new MessageActionRow().addComponents(menu)),
            ephemeral: true
        })
    }
}

export const interactionIds = [customIdSelectSearchResultTrack, customIdSelectSearchResultAlbum, customIdSelectSearchResultPlaylist]


export async function interact(interaction: SelectMenuInteraction) {
    if (!interaction.guildId) return;
    if (!(interaction.member instanceof GuildMember)) return
    
    const updateAndClear = (content: string) => interaction.update({
        content: content,
        components: []
    })

    let subscription = getSubscription(interaction.guildId, true, interaction.member.voice.channel)

    if (!subscription) {
        await interaction.update('Join a voice channel and then try that again!');
        return;
    }

    switch (interaction.customId) {
        case customIdSelectSearchResultTrack:
            // Extract the track id from the command
            const trackId = interaction.values[0];

            // Make sure the connection is ready before processing the user's request
            try {
                await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
            } catch (error) {
                console.warn(error);
                await interaction.update('Failed to join voice channel within 20 seconds, please try again later!');
                return;
            }

            try {
                let nowPlayingMessage: Message | undefined = undefined
                // Attempt to create a Track from the user's video URL
                const track = await Track.from(trackId, interaction.user, {
                    async onStart() {
                        nowPlayingMessage = await interaction.channel?.send({
                            content: "Now Playing",
                            embeds: [await track.generateEmbed()]
                        })
                    },
                    async onFinish() {
                        if (nowPlayingMessage?.deletable) {
                            await nowPlayingMessage?.delete()
                        }
                    },
                    async onError(error) {
                        console.warn(error)
                        if (nowPlayingMessage?.deletable) {
                            await nowPlayingMessage?.delete()
                        }
                        await interaction.channel?.send(`An error occurred playing \`${Util.escapeMarkdown(track.info.name)}\``)
                    },
                });
                // Enqueue the track and reply a success message to the user
                subscription.enqueue(track);
                updateAndClear(`\`${Util.escapeMarkdown(track.info.name)}\` added to queue`)
            } catch (error) {
                console.warn(error);
                await interaction.followUp('Failed to play track, please try again later!');
            }
            break;
        case customIdSelectSearchResultAlbum:
        case customIdSelectSearchResultPlaylist:
            await updateAndClear('Not yet implemented, please be patient!')
            break;
        default:
            throw new Error(`Unknown interaction ID ${interaction.customId}`)
    }
}
