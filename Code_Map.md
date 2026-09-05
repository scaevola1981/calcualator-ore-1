# Code Map: Contor Updated

## Core Application
- **[main.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/main.tsx)**: Application entry point. Renders the root `App` component.
- **[App.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/App.tsx)**: Main application container. Handles:
    - Routing (State-based: Home, History, Calculator, Settings).
    - Global State (Work Sessions, Settings).
    - Geofencing hooks integration.
    - Theme switching logic.
- **[types.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/types.ts)**: TypeScript definitions for `WorkSession`, `AppSettings`, etc.

## Components (Views)
- **[CalculatorPage.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/components/CalculatorPage.tsx)**: Salary calculator.
    - **Simple Mode**: Rate × Total Hours.
    - **Detailed Mode**: Breakdown of Normal/Night/Overtime rates + Meal Tickets.
- **[HistoryPage.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/components/HistoryPage.tsx)**: Work history management.
    - Lists sessions by day.
    - Monthly calendar view.
    - Manual session entry/editing.
- **[SettingsPage.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/components/SettingsPage.tsx)**: Application configuration.
    - **Aspect**: Theme toggle (Light/Dark).
    - **Financial**: Salary, Meal Ticket Value, Name.
    - **Automation**: Geofencing (GPS) setup.
- **[ChartCard.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/components/ChartCard.tsx)**: Recharts-based bar chart for weekly hours (Normal vs Overtime).
- **[GeofenceMapModal.tsx](file:///Users/florindorobantu/Desktop/contor-updated/src/components/GeofenceMapModal.tsx)**: Leaflet map modal for selecting Work Point location.

## Logic & Services
- **[hooks/useGeofencing.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/hooks/useGeofencing.ts)**: Custom hook for GPS monitoring. Handles zone entry/exit detection logic.
- **[services/notifications.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/services/notifications.ts)**: Browser notification service (Welcome, Start, Stop).

## Utilities
- **[utils/timeRounding.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/utils/timeRounding.ts)**: Core logic for:
    - Rounding entry/exit times (30min / 1h rules).
    - Calculating effective hourly rates.
    - Splitting sessions across midnights.
- **[utils/holidays.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/utils/holidays.ts)**: Legal holidays data (RO).
- **[utils/dateUtils.ts](file:///Users/florindorobantu/Desktop/contor-updated/src/utils/dateUtils.ts)**: Date formatting helpers.

## Styles
- **[index.css](file:///Users/florindorobantu/Desktop/contor-updated/src/index.css)**: Tailwind directives and global variable overrides.
- **[dark-mode.css](file:///Users/florindorobantu/Desktop/contor-updated/src/dark-mode.css)**: Specific dark mode overrides (legacy or specific components).
