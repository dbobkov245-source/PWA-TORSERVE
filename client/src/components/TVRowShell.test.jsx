// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import TVRowShell from './TVRowShell'

it('adds inert edge spacers with explicit item geometry', () => {
    const view = render(
        <TVRowShell
            id="centered"
            title="Centered"
            items={[{ id: 1 }]}
            itemWidth="300px"
            itemHalfWidth="150px"
            renderItem={item => <span>{item.id}</span>}
        />
    )
    const row = view.getByRole('group', { name: 'Centered' })
    const spacers = row.querySelectorAll('.tv-row-edge-spacer')

    expect(spacers).toHaveLength(2)
    expect(row.firstElementChild).toBe(spacers[0])
    expect(row.lastElementChild).toBe(spacers[1])
    expect(spacers[0].classList.contains('tv-row-leading-spacer')).toBe(true)
    expect(spacers[1].classList.contains('tv-row-trailing-spacer')).toBe(true)
    expect([...spacers].every(node => node.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect([...spacers].every(node => !node.hasAttribute('tabindex'))).toBe(true)
    expect(row.style.getPropertyValue('--tv-row-card-width')).toBe('300px')
    expect(row.style.getPropertyValue('--tv-row-card-half-width')).toBe('150px')
})

it('selects the focused horizontal item by D-Pad', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const onSelect = vi.fn()
    const view = render(
        <TVRowShell
            id="x"
            title="X"
            source="TMDB"
            items={items}
            isActive
            onSelect={onSelect}
            renderItem={(item) => <span>{item.id}</span>}
        />
    )

    const row = view.getByRole('group', { name: 'X' })
    expect(row.tabIndex).toBe(0)
    fireEvent.keyDown(row, { key: 'ArrowRight' })
    fireEvent.keyDown(row, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(items[1])
})

it('selects an item when its TV card is clicked', () => {
    const items = [{ id: 1 }, { id: 2 }]
    const onSelect = vi.fn()
    const view = render(
        <TVRowShell
            id="touch"
            title="Touch"
            items={items}
            isActive
            onSelect={onSelect}
            renderItem={item => <span>{item.id}</span>}
        />
    )

    fireEvent.click(view.getByText('2'))

    expect(onSelect).toHaveBeenCalledWith(items[1])
})

it('ignores D-Pad input while inactive', () => {
    const onSelect = vi.fn()
    const view = render(
        <TVRowShell
            id="inactive"
            title="Inactive"
            source="TMDB"
            items={[{ id: 1 }, { id: 2 }]}
            isActive={false}
            onSelect={onSelect}
            renderItem={(item) => <span>{item.id}</span>}
        />
    )

    const row = view.getByRole('group', { name: 'Inactive' })
    fireEvent.keyDown(row, { key: 'ArrowRight' })
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.click(view.getByText('2'))

    expect(onSelect).not.toHaveBeenCalled()
})

it('reports focused items and proximity to the row end', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const onFocusChange = vi.fn()
    const onNearEnd = vi.fn()
    const view = render(
        <TVRowShell
            id="signals"
            title="Signals"
            source="TMDB"
            items={items}
            isActive
            onFocusChange={onFocusChange}
            onNearEnd={onNearEnd}
            renderItem={(item) => <span>{item.id}</span>}
        />
    )

    expect(onFocusChange).toHaveBeenCalledWith(items[0], 0)
    expect(onNearEnd).not.toHaveBeenCalled()
    fireEvent.keyDown(view.getByRole('group', { name: 'Signals' }), { key: 'ArrowRight' })

    expect(onFocusChange).toHaveBeenLastCalledWith(items[1], 1)
    expect(onNearEnd).toHaveBeenCalledWith(1)
})

it('starts from a restored index and keeps selection aligned after moving right', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const onSelect = vi.fn()
    const onFocusChange = vi.fn()
    const view = render(
        <TVRowShell
            id="restored"
            title="Restored"
            items={items}
            initialIndex={2}
            isActive
            onSelect={onSelect}
            onFocusChange={onFocusChange}
            renderItem={item => <span>{item.id}</span>}
        />
    )
    const row = view.getByRole('group', { name: 'Restored' })

    await waitFor(() => expect(document.activeElement?.textContent).toBe('3'))
    expect(onFocusChange.mock.calls[0]).toEqual([items[2], 2])
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(items[2])

    fireEvent.keyDown(row, { key: 'ArrowRight' })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(items[3])
})

it('synchronizes the logical index when an item receives DOM focus', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const onSelect = vi.fn()
    const view = render(
        <TVRowShell
            id="dom-focus"
            title="DOM focus"
            items={items}
            isActive
            onSelect={onSelect}
            renderItem={item => <span>{item.id}</span>}
        />
    )

    const cards = view.container.querySelectorAll('.snap-item')
    fireEvent.focus(cards[2])
    fireEvent.keyDown(view.getByRole('group', { name: 'DOM focus' }), { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(items[2])
})

it('fires near-end once per actual index movement, not callback or item rerenders', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const onNearEnd = vi.fn()
    const props = {
        id: 'stable-near-end',
        title: 'Stable near end',
        items,
        initialIndex: 0,
        isActive: true,
        onNearEnd,
        renderItem: item => <span>{item.id}</span>
    }
    const view = render(<TVRowShell {...props} />)
    const row = view.getByRole('group', { name: 'Stable near end' })

    fireEvent.keyDown(row, { key: 'ArrowRight' })
    expect(onNearEnd).toHaveBeenCalledTimes(1)
    view.rerender(<TVRowShell {...props} items={[...items]} onFocusChange={vi.fn()} />)
    view.rerender(<TVRowShell {...props} items={[...items]} onNearEnd={vi.fn(onNearEnd)} />)

    expect(onNearEnd).toHaveBeenCalledTimes(1)
})

it('does not report focus again when only parent callbacks rerender', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const onFocusChange = vi.fn()
    const props = {
        id: 'stable-focus-report',
        title: 'Stable focus report',
        items,
        initialIndex: 1,
        isActive: true,
        onFocusChange,
        renderItem: item => <span>{item.id}</span>
    }
    const view = render(<TVRowShell {...props} />)
    expect(onFocusChange).toHaveBeenCalledTimes(1)

    view.rerender(<TVRowShell {...props} onFocusChange={vi.fn(onFocusChange)} />)
    view.rerender(<TVRowShell {...props} onFocusChange={vi.fn(onFocusChange)} />)

    expect(onFocusChange).toHaveBeenCalledTimes(1)
})

it('keeps item ref callbacks stable so spatial registration survives a focus move', () => {
    // Every D-Pad press re-renders the shell. An inline registerRef made
    // each card's ref callback fresh, so React detached and re-attached
    // all of them — unregistering and re-registering every card with the
    // spatial engine on each keypress. HomeRow already avoids this.
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const attachments = []
    const renderItem = (item, index, focused) => (
        <span ref={node => { if (node) attachments.push(item.id) }}>
            {focused ? `[${item.id}]` : item.id}
        </span>
    )
    const view = render(
        <TVRowShell id="stable-refs" title="Stable refs" items={items} isActive renderItem={renderItem} />
    )
    const row = view.getByRole('group', { name: 'Stable refs' })

    // Mount plus the row's first focus settle; what matters is the delta
    // per keypress afterwards, not this baseline.
    expect(attachments.length).toBeGreaterThan(0)
    const afterMount = attachments.length

    fireEvent.keyDown(row, { key: 'ArrowRight' })

    // Only the two cards whose focused flag flipped may re-render; the
    // untouched cards must keep their existing DOM nodes and refs.
    expect(attachments.length - afterMount).toBeLessThanOrEqual(2)
})

it('keeps item refs intact when the list reorders', async () => {
    // Rows on Home reorder as batches arrive. React detaches the old index
    // before the new owner attaches, so clearing a slot unconditionally
    // wiped a live node: itemRefs[i] went null, useTVNavigation could not
    // call node.focus(), and the D-Pad appeared frozen on the first card.
    const first = { id: 'a' }
    const second = { id: 'b' }
    const props = {
        id: 'reorder',
        title: 'Reorder',
        isActive: true,
        initialIndex: 0,
        renderItem: item => <span>{item.id}</span>
    }

    const view = render(<TVRowShell {...props} items={[first, second]} />)
    const row = view.getByRole('group', { name: 'Reorder' })
    await waitFor(() => expect(document.activeElement?.textContent).toBe('a'))

    view.rerender(<TVRowShell {...props} items={[second, first]} />)

    // Focus must still be able to travel to the other card.
    fireEvent.keyDown(row, { key: 'ArrowRight' })
    await waitFor(() => expect(document.activeElement?.textContent).toBe('a'))
})

it('can opt a row out of the global mint focus ring', () => {
    // .focusable:focus in index.css paints a 4px rgba(45,212,191) ring on
    // the wrapper. Removing a card's own border does nothing about it —
    // the ring is applied by the cascade, outside the card component.
    const items = [{ id: 1 }, { id: 2 }]
    const props = { id: 'ring', title: 'Ring', items, isActive: true, renderItem: item => <span>{item.id}</span> }

    const withRing = render(<TVRowShell {...props} />)
    expect(withRing.container.querySelector('.snap-item').className).not.toContain('tv-no-focus-ring')
    withRing.unmount()

    const withoutRing = render(<TVRowShell {...props} focusRing={false} />)
    expect(withoutRing.container.querySelector('.snap-item').className).toContain('tv-no-focus-ring')
})

it('drops the focus highlight when the row loses input, but keeps it reachable', () => {
    // Opening the sidebar flips isActive to false. The row kept its
    // focusedIndex, so a card stayed lit while the D-Pad was driving the
    // sidebar — it read as a stuck cursor on a frozen page.
    const items = [{ id: 1 }, { id: 2 }]
    const props = {
        id: 'inactive-highlight',
        title: 'Inactive highlight',
        items,
        initialIndex: 0,
        renderItem: (item, _index, focused) => <span>{focused ? `[${item.id}]` : item.id}</span>
    }

    const view = render(<TVRowShell {...props} isActive />)
    expect(view.getByText('[1]')).toBeTruthy()

    view.rerender(<TVRowShell {...props} isActive={false} />)

    expect(view.queryByText('[1]')).toBeNull()
    expect(view.getByText('1')).toBeTruthy()
    // Still the row's entry point, so returning from the sidebar lands here.
    expect(view.container.querySelectorAll('.snap-item')[0].tabIndex).toBe(0)

    view.rerender(<TVRowShell {...props} isActive />)
    expect(view.getByText('[1]')).toBeTruthy()
})

it('only highlights a card while the focus actually sits in this row', () => {
    // Every row keeps its own focusedIndex, so each one lit a card even
    // though the D-Pad was in a different row. Two or three posters glowed
    // at once and the stale ones looked like a cursor stuck in place.
    const items = [{ id: 1 }, { id: 2 }]
    const props = {
        id: 'one-highlight',
        title: 'One highlight',
        items,
        isActive: true,
        initialIndex: 0,
        renderItem: (item, _index, focused) => <span>{focused ? `[${item.id}]` : item.id}</span>
    }

    const view = render(<TVRowShell {...props} />)
    const cards = view.container.querySelectorAll('.snap-item')

    fireEvent.focus(cards[0])
    expect(view.getByText('[1]')).toBeTruthy()

    // Focus leaves for another row entirely.
    fireEvent.blur(cards[0], { relatedTarget: document.body })
    expect(view.queryByText('[1]')).toBeNull()

    // Coming back restores the remembered card.
    fireEvent.focus(cards[0])
    expect(view.getByText('[1]')).toBeTruthy()
})
