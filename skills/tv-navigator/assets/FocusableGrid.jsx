// REFERENCE IMPLEMENTATION: Use for isolated grids. 
// WARNING: For global home rows, ensure trapFocus is FALSE.
import React, { useRef, useEffect } from 'react';
import useTVNavigation from '../../client/src/hooks/useTVNavigation';

const FocusableGrid = ({ items, onSelect }) => {
    const itemRefs = useRef({});
    
    const { focusedIndex, containerProps, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: 4, // Example: 4 columns
        itemRefs,
        onSelect: (index) => onSelect(items[index]),
        trapFocus: true
    });

    // Auto-focus container on mount if needed
    // useEffect(() => { itemRefs.current[0]?.focus(); }, []);

    return (
        <div 
            className="grid grid-cols-4 gap-4 p-4"
            {...containerProps} // Captures ArrowKeys
        >
            {items.map((item, index) => (
                <div
                    key={item.id}
                    ref={el => itemRefs.current[index] = el}
                    className={`
                        p-4 rounded-lg transition-transform duration-200
                        ${isFocused(index) ? 'scale-105 border-2 border-white shadow-lg' : 'opacity-80'}
                    `}
                    // Optional: Support mouse overlap
                    onClick={() => onSelect(item)} 
                >
                    <img src={item.poster} alt={item.title} />
                    <p>{item.name}</p>
                </div>
            ))}
        </div>
    );
};

export default FocusableGrid;
