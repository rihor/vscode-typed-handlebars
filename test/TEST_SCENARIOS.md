# Test Scenarios for Handlebars IntelliSense

## Expected Completion Behavior

### 1. Helper Completions

#### Test: `{{#if `
- **Expected**: Should suggest optional properties
- **Results**: `user.age` (optional property from Template)

#### Test: `{{#each `
- **Expected**: Should suggest array properties
- **Results**: `posts` (Array type from Template)

#### Test: `{{#with `
- **Expected**: Should suggest object properties
- **Results**: `user`, `settings` (object types)

### 2. Property Access Completions

#### Test: `{{user.`
- **Expected**: Should suggest nested properties
- **Results**: `name`, `email`, `age`

#### Test: `{{settings.`
- **Expected**: Should suggest nested properties
- **Results**: `theme`, `notifications`

#### Test: `{{posts[0].`
- **Expected**: Should suggest array item properties
- **Results**: `id`, `title`, `published`

### 3. Root Expression Completions

#### Test: `{{`
- **Expected**: Should suggest all root properties + helpers
- **Results**: `user`, `posts`, `settings`, `if`, `each`, `with`, `unless`, etc.

## Template Interface

```typescript
interface Template {
  user: {
    name: string;
    email: string;
    age?: number;
  };
  posts: Array<{
    id: number;
    title: string;
    published: boolean;
  }>;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}
```

## State Machine Logic

### State Transitions:
1. **NORMAL → OPEN_EXPRESSION**: When `{{` detected
2. **OPEN_EXPRESSION → HELPER_BLOCK**: When `#` after `{{`
3. **HELPER_BLOCK → HELPER_ARGS**: When space after helper name
4. **HELPER_ARGS → NORMAL**: When `}}` detected
5. **OPEN_EXPRESSION → PROPERTY_ACCESS**: When property name starts
6. **Any → NORMAL**: When `}` detected

### Key Fix Applied:
- **HELPER_ARGS state no longer switches to PROPERTY_ACCESS**
- Context stays as `'helper'` until `}}` is reached
- Completion provider decides what to suggest based on helper name
