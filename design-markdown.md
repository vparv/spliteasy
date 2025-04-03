# Venmo Me Now Design System

## Colors

### Primary Colors

- Blue: `from-blue-600` (#2563EB)
  - Used for primary actions, buttons, and gradients
- Purple: `to-purple-600` (#9333EA)
  - Used in gradients and accents
- White: `bg-white` (#FFFFFF)
  - Primary background color

### Secondary Colors

- Gray Scale:
  - Light Gray: `bg-gray-50` (#F9FAFB) - Background for cards and sections
  - Medium Gray: `text-gray-500` (#6B7280) - Secondary text
  - Dark Gray: `text-gray-900` (#111827) - Primary text
- Status Colors:
  - Success: `text-green-600` (#059669)
  - Error: `text-red-500` (#EF4444)

## Typography

### Font Families

```css
/* Base font */
font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;

/* Monospace (for numbers, code) */
font-family: var(--font-geist-mono);
```

### Text Styles

#### Headings

```jsx
// Page Title (H1)
<h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">

// Section Title (H2)
<h2 className="text-lg font-semibold text-gray-800">

// Card Title (H3)
<h3 className="font-medium text-inherit">
```

#### Body Text

- Regular: `text-base text-gray-600`
- Small: `text-sm text-gray-500`
- Extra Small: `text-xs text-gray-400`

## Layout

### Page Structure

```jsx
// Standard page wrapper
<div className="min-h-screen bg-white flex flex-col items-center p-6">
  <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
    {/* Content */}
  </div>
</div>
```

### Spacing

- Page Padding: `p-6`
- Section Spacing: `space-y-8`
- Component Spacing: `space-y-4`
- Button Padding: `px-6 py-4`
- Input Padding: `px-4 py-2`

## Components

### Cards

```jsx
// Info Card
<div className="w-full bg-blue-50 p-4 rounded-xl space-y-2">
  <div className="text-lg font-medium text-gray-900">{/* Title */}</div>
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">Label:</span>
    <span className="text-xl font-bold text-blue-600">Value</span>
  </div>
</div>
```

### Buttons

#### Primary Button

```jsx
<button
  className="w-full py-4 px-6 bg-blue-500 text-white rounded-2xl 
    transition-all duration-300 font-medium text-lg 
    hover:bg-blue-600 
    disabled:opacity-50 disabled:cursor-not-allowed"
>
  Button Text
</button>
```

#### Secondary Button

```jsx
<button
  className="w-full py-4 px-6 border-2 border-blue-600 
    text-blue-600 rounded-2xl transition-all duration-300 
    font-medium text-lg hover:bg-blue-50"
>
  Button Text
</button>
```

### Form Elements

#### Text Input

```jsx
<input
  type="text"
  className="w-full px-4 py-2 border-2 text-black 
    border-gray-200 rounded-xl focus:border-blue-500 
    focus:outline-none transition-colors"
  placeholder="Enter text"
/>
```

#### Input Label

```jsx
<label className="block text-sm font-medium text-gray-700 mb-1">
  Label Text
</label>
```

### Loading States

#### Spinner

```jsx
<div className="flex items-center justify-center">
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
  Loading...
</div>
```

#### Full Page Loading

```jsx
<div className="min-h-screen bg-white flex items-center justify-center">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
</div>
```

### Progress Indicators

#### Progress Bar

```jsx
<div className="w-full bg-gray-200 rounded-full h-2.5">
  <div
    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
    style={{ width: `${percentage}%` }}
  />
</div>
```

## Animations

### Transitions

- All transitions: `transition-all duration-300`
- Button hover: `hover:bg-blue-600 hover:scale-105`
- Loading spinner: `animate-spin`

### Gradients

```jsx
// Text gradient
bg-gradient-to-r from-blue-600 to-purple-600

// Background gradient
bg-gradient-to-br from-white to-blue-50
```

## Responsive Design

The application is primarily designed for mobile-first approach with a fixed width container:

```jsx
<div className="w-full max-w-md mx-auto">
```

## Best Practices

1. **Consistency**

   - Use predefined spacing values (p-6, space-y-8)
   - Maintain consistent border radius (rounded-xl)
   - Use standard color palette

2. **Interactive States**

   - Always include hover states for clickable elements
   - Show disabled states clearly
   - Provide loading states for async actions

3. **Accessibility**

   - Use semantic HTML elements
   - Include proper ARIA labels
   - Maintain sufficient color contrast

4. **Performance**
   - Use Tailwind's JIT compiler
   - Minimize custom CSS
   - Leverage utility classes for common patterns
