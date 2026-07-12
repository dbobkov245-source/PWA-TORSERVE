// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import TVRowShell from './TVRowShell'

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
