import { Util } from 'discord.js';
import { decode as decodeHTMLEntity } from 'html-entities';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

await i18next.use(Backend).init({
    lng: "en",
    debug: true,
    backend: {
        loadPath: 'locales/{{lng}}/{{ns}}.yaml'
    },
    interpolation: {
        // TODO: What kind of escaping should we do?
        escapeValue: false,
    }
});

const formatInlineBlock = (value: string) => {
    return "`" + Util.escapeInlineCode(value) + "`"
}

i18next.services.formatter?.add('inline_block', formatInlineBlock)

// Needed until https://github.com/microsoft/TypeScript/pull/47254 merges
declare namespace Intl {
    const ListFormat: any
}

export const formatArtists = (artists: SpotifyApi.ArtistObjectSimplified[], lng = 'en') => {
    return new Intl.ListFormat(lng, { type: 'unit' })
        .format(artists
            .map(artist => artist.name)
        )
}

i18next.services.formatter?.add('artists', formatArtists)

i18next.services.formatter?.add('truncate_ellipses', (message: string, _lng, { max_length }) => {
    return message.length <= max_length ? message : message.substring(0, max_length - 3) + '\u2026'
})

i18next.services.formatter?.add('duration_ms', (value: string, _lng) => {
    let duration = parseInt(value)
    let seconds = Math.floor(duration / 1000) % 60
    let minutes = Math.floor(duration / 60000).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
})

i18next.services.formatter?.add('decode_entity', (value: string) => decodeHTMLEntity(value, { scope: 'strict' }))
