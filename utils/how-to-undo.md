# How to Implement Undo/Redo Functionality

This guide explains how to implement undoable operations in the Wolffspoint project using the existing undo/redo system.

## Overview

The project uses a command pattern-based undo/redo system that tracks operations and allows users to undo/redo them using keyboard shortcuts (Ctrl+Z/Cmd+Z for undo, Ctrl+Shift+Z/Cmd+Shift+Z for redo).

## Key Components

### 1. useUndoRedo Hook
```tsx
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';

const { executeCommand } = useUndoRedo();
const createUndoSnapshot = useCreateUndoSnapshot();
```

### 2. Command Pattern
Each undoable operation follows this pattern:
- `action`: The function that performs the operation
- `undoAction`: The function that reverses the operation
- `description`: User-friendly description for toast notifications

## Implementation Pattern

### Step 1: Separate Concerns
Keep your business logic separate from undo tracking:

```tsx
// Pure business logic function
const addRole = () => {
    const newRole: RoleTableItem = {
        role: "New Role",
        doesRoleVote: false,
        roleMessage: "Unset role message",
        aboutRole: "## NEW ROLE - No description set",
        isVisible: true
    };
    setRoleTable([...roles, newRole]);
    setDoSync(true);
};

// Undo tracking wrapper
const UNDOABLEaddRole = () => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    
    executeCommand({
        action: addRole,
        undoAction: () => {
            setRoleTable(previousRoleTable);
            setDoSync(true);
        },
        description: "Add Role"
    });
};
```

### Step 2: Create Snapshots
Use `createUndoSnapshot` to create deep copies of your state:

```tsx
const previousState = createUndoSnapshot(yourState?.value ?? []);
```

This handles:
- Deep cloning of complex objects
- Proper handling of null/undefined values
- Uses `structuredClone` when available, falls back to JSON parse/stringify

### Step 3: Execute Command
Wrap your operation in the executeCommand:

```tsx
executeCommand({
    action: yourActionFunction,
    undoAction: yourUndoFunction,
    description: "User-friendly description"
});
```

## Important Lessons Learned

### 1. Separation of Concerns is Critical
- **Business Logic**: Keep your core operation logic in a separate function
- **Undo Logic**: The undo wrapper should only handle snapshot tracking
- **Benefits**: Cleaner code, easier testing, reusable business logic

### 2. Proper State Management
- Always create snapshots **before** modifying state
- Ensure both action and undoAction handle any side effects (like `setDoSync`)
- Use the same state setting pattern in both directions

### 3. User Experience
- Provide descriptive messages for toast notifications
- Users see "Undo: Add Role" when they undo an operation
- Keyboard shortcuts work automatically (Ctrl+Z/Cmd+Z)

### 4. Integration with UserVariables
The system works seamlessly with the userVariables hooks:
```tsx
const [roleTable, setRoleTable] = useUserList<RoleTableItem[]>({
    key: "roleTable",
    itemId: gameId,
    privacy: "PUBLIC",
});
```

## Common Patterns

### Adding Items
```tsx
const UNDOABLEaddItem = () => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    
    executeCommand({
        action: () => {
            const newItem = createNewItem();
            setItems([...items, newItem]);
        },
        undoAction: () => {
            setItems(previousItems);
        },
        description: "Add Item"
    });
};
```

### Updating Items
```tsx
const UNDOABLEupdateItem = (index: number, newValue: any) => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    const nextItems = createUndoSnapshot(previousItems);
    nextItems[index] = { ...nextItems[index], ...newValue };

    executeCommand({
        action: () => setItems(nextItems),
        undoAction: () => setItems(previousItems),
        description: "Update Item"
    });
};
```

### Deleting Items
```tsx
const UNDOABLEdeleteItem = (index: number) => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    const nextItems = createUndoSnapshot(previousItems);
    nextItems[index] = { ...nextItems[index], isVisible: false };

    executeCommand({
        action: () => setItems(nextItems),
        undoAction: () => setItems(previousItems),
        description: "Delete Item"
    });
};
```

## Best Practices

1. **Always create snapshots before modifying state**
2. **Keep business logic separate from undo tracking**
3. **Handle all side effects in both action and undoAction**
4. **Use descriptive operation names**
5. **Test both the action and undo behavior**
6. **Consider edge cases (empty arrays, null values, etc.)**

## Integration Points

The undo system integrates with:
- **Toast Notifications**: Shows undo/redo feedback to users
- **Keyboard Shortcuts**: Ctrl+Z/Cmd+Z work automatically
- **UserVariables**: Seamlessly works with persistent state
- **Component State**: Can be used with any React state management

## Troubleshooting

### Common Issues
1. **State not reverting**: Ensure undoAction properly restores the previous snapshot
2. **Missing sync**: Make sure both action and undoAction trigger any necessary sync operations
3. **Memory leaks**: Use proper snapshot creation to avoid reference issues

### Debug Tips
- Check that `createUndoSnapshot` is called before state changes
- Verify both action and undoAction handle the same side effects
- Test with keyboard shortcuts to ensure full integration
