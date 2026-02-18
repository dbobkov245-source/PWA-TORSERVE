import { test, expect } from './test-runner.js'
import { RutorProvider } from '../providers/RutorProvider.js'

test('Rutor parser extracts seeders from green span with img + nbsp', () => {
    const provider = new RutorProvider()
    const html = `
        <table>
            <tr class="gai">
                <td>11&nbsp;Сен&nbsp;25</td>
                <td colspan="2">
                    <a href="magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&dn=rutor.info">magnet</a>
                    <a href="/torrent/1052665/test">Ubuntu Test</a>
                </td>
                <td align="right">4.25&nbsp;GB</td>
                <td align="center"><span class="green"><img src="/up.gif" alt="S" />&nbsp;12</span></td>
            </tr>
        </table>
    `

    const results = provider._parseResults(html)

    expect(results.length).toBe(1)
    expect(results[0].seeders).toBe(12)
    expect(results[0].size).toBe('4.25 GB')
    expect(results[0].sizeBytes > 4 * 1024 ** 3).toBe(true)
})

test('Rutor parser supports comma decimal size format', () => {
    const provider = new RutorProvider()
    const html = `
        <table>
            <tr class="tum">
                <td>01&nbsp;Янв&nbsp;26</td>
                <td colspan="2">
                    <a href="magnet:?xt=urn:btih:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb&dn=rutor.info">magnet</a>
                    <a href="/torrent/999/test">Another Test</a>
                </td>
                <td align="right">1,50&nbsp;GB</td>
                <td align="center"><span class="green"><img src="/up.gif" />&nbsp;2</span></td>
            </tr>
        </table>
    `

    const results = provider._parseResults(html)

    expect(results.length).toBe(1)
    expect(results[0].seeders).toBe(2)
    expect(results[0].size).toBe('1.50 GB')
    expect(results[0].sizeBytes > 1024 ** 3).toBe(true)
})

test('Rutor parser handles align without quotes and RU size units', () => {
    const provider = new RutorProvider()
    const html = `
        <table>
            <tr class="gai">
                <td>15&nbsp;Фев&nbsp;26</td>
                <td colspan="2">
                    <a href="magnet:?xt=urn:btih:cccccccccccccccccccccccccccccccccccccccc&dn=rutor.info">magnet</a>
                    <a href="/torrent/123/test">RU Units Test</a>
                </td>
                <td align=right>15,8&nbsp;ГБ</td>
                <td align="center"><span class="green"><img src="/up.gif" />&nbsp;44</span></td>
            </tr>
        </table>
    `

    const results = provider._parseResults(html)

    expect(results.length).toBe(1)
    expect(results[0].seeders).toBe(44)
    expect(results[0].size).toBe('15.80 GB')
    expect(results[0].sizeBytes > 15 * 1024 ** 3).toBe(true)
})

test('Rutor parser skips right-aligned comments cell and reads actual size cell', () => {
    const provider = new RutorProvider()
    const html = `
        <table>
            <tr class="tum">
                <td>05&nbsp;Фев&nbsp;26</td>
                <td>
                    <a href="magnet:?xt=urn:btih:dddddddddddddddddddddddddddddddddddddddd&dn=rutor.info">magnet</a>
                    <a href="/torrent/1071627/test">Comment cell test</a>
                </td>
                <td align="right">3<img src="/com.gif" alt="C" /></td>
                <td align="right">3.94&nbsp;GB</td>
                <td align="center"><span class="green"><img src="/up.gif" />&nbsp;261</span></td>
            </tr>
        </table>
    `

    const results = provider._parseResults(html)

    expect(results.length).toBe(1)
    expect(results[0].seeders).toBe(261)
    expect(results[0].size).toBe('3.94 GB')
    expect(results[0].sizeBytes > 3 * 1024 ** 3).toBe(true)
})
