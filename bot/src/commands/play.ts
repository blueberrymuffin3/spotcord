import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageActionRow, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { spotifyApi } from '../spotify-api.js';
import { formatDurationMs, formatPlural, truncateEllipses } from '../util.js';
import { decode as decodeEntity } from 'html-entities';

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
    let { body } = await spotifyApi.search(query, ['track', 'album', 'playlist'])

    const menus: MessageSelectMenu[] = []

    if (body.tracks!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultTrack)
            .setPlaceholder(`${formatPlural(body.tracks!.total, 'tracks', 'track')} found`)
            .addOptions(body.tracks!.items.map(track => {
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

    if (body.albums!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultAlbum)
            .setPlaceholder(`${formatPlural(body.albums!.total, 'albums', 'album')} found`)
            .addOptions(body.albums!.items.map(album => {
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

    if (body.playlists!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultPlaylist)
            .setPlaceholder(`${formatPlural(body.playlists!.total, 'playlists', 'playlist')} found`)
            .addOptions(body.playlists!.items.map(playlist => {
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
    switch (interaction.customId) {
        case customIdSelectSearchResultTrack:
        case customIdSelectSearchResultAlbum:
        case customIdSelectSearchResultPlaylist:
            interaction.update({
                content: `Playing ${interaction.values[0]}... \`${interaction.customId}\``,
                components: []
            })
            break;
        default:
            throw new Error(`Unknown interaction ID ${interaction.customId}`)
    }
}
