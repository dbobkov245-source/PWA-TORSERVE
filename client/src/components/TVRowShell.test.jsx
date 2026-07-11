// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react'
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
