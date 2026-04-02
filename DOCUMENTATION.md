# GoalFlow - Project Documentation

## 1. Development Setup
To set up the development environment for GoalFlow, follow these steps:

1.  **Clone the Repository**: Ensure you have the latest source code.
2.  **Install Dependencies**: Run `npm install` to install all necessary packages.
3.  **Environment Variables**: Create a `.env` file based on `.env.example` and add your `GEMINI_API_KEY`.
4.  **Start Development Server**: Run `npm run dev`. The app will be accessible at `http://localhost:3000`.
5.  **Build for Production**: Run `npm run build` to generate the production-ready `dist` folder.

## 2. Development Requirements
The project is built using modern web technologies:
-   **Framework**: React 19 with Vite 6.
-   **Language**: TypeScript 5.8+.
-   **Styling**: Tailwind CSS 4 (Utility-first CSS).
-   **Animations**: Framer Motion (for smooth UI transitions).
-   **Icons**: Lucide React.
-   **AI Integration**: `@google/genai` (Gemini 3 Flash).
-   **Date Handling**: `date-fns`.
-   **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`).
-   **Persistence**: Browser `localStorage` with PWA support (Service Workers).

## 3. User Requirements
The application is designed for high-achievers who need:
-   **Daily Accountability**: A clear list of tasks categorized by life areas (Spiritual, Physical, Learning, Career, Content, Project).
-   **Financial Tracking**: Monitoring progress towards specific monthly income goals.
-   **Consistency Monitoring**: Streak tracking to encourage daily engagement.
-   **Focus Tools**: An integrated Pomodoro timer for deep work sessions.
-   **AI Assistance**: A personal AI assistant (Ryna) to help reshuffle schedules when unexpected events occur.
-   **Data Portability**: Ability to export daily progress to CSV for external analysis.

## 4. PRD (Product Requirements Document) & Product Details
### Product Vision
GoalFlow is a "High-Performance Dashboard" that combines task management with AI-driven coaching to help users stay accountable to their long-term goals.

### Core Features
-   **Categorized Task Management**: Pre-defined and custom tasks with completion tracking.
-   **Dynamic Schedule**: A live timeline that highlights current and upcoming activities.
-   **Ryna AI PA**: A voice/text assistant that can analyze the day's progress and suggest schedule adjustments.
-   **Analytics Dashboard**: Visual representation of streaks and completion rates.
-   **Pomodoro Timer**: A simple, effective focus tool integrated into the header.
-   **PWA Support**: Installable as a standalone app with offline caching capabilities.

## 5. Nature of Work Done
The recent development phase focused on **System Stability** and **Data Integrity**. The primary goal was to eliminate application crashes caused by null or undefined data states, particularly when the user has no previous history or when the AI attempts to modify the global state.

## 6. Changes Made
-   **Robust History Access**: Implemented defensive programming patterns across `App.tsx` and `useRyna.ts`. All accesses to `globalData.history` now use optional chaining (`?.`) and nullish coalescing (`|| {}`) to prevent `TypeError`.
-   **State Initialization**: Refined the `globalData` initialization logic to ensure the `history` object is always present, even if `localStorage` is empty.
-   **Type Safety Improvements**: Fixed linting errors in the `ErrorBoundary` component and installed missing `@types` for React and React-DOM to ensure a clean build process.
-   **AI State Sync**: Updated the `useRyna` hook to safely merge AI-generated schedule changes into the global history without overwriting existing data.

## 7. Errors to be Fixed & Future Updates
To meet the "Entire Standard" of a production-grade application, the following items are planned:

### Errors to be Fixed
-   **AI Response Parsing**: Occasionally, the Gemini API returns markdown blocks around JSON. A more robust regex-based parser is needed to handle inconsistent LLM outputs.
-   **Notification Reliability**: Browser notification requests can be blocked or ignored; a custom UI fallback for "In-App Notifications" should be implemented.

### Future Updates
-   **Advanced Data Visualization**: Integrate `recharts` to provide interactive weekly and monthly progress graphs.
-   **Cloud Synchronization**: Implement **Firebase** (Firestore & Auth) to allow users to sync their data across multiple devices, moving beyond `localStorage`.
-   **Custom Task Templates**: Allow users to define their own recurring task templates instead of relying on the hardcoded `DEFAULT_TASKS`.
-   **Enhanced AI Context**: Provide Ryna with more historical context (last 7 days of completion data) so she can provide more personalized coaching and "tough love" advice.
-   **Theming Engine**: Add a user-selectable theme toggle (Light/Dark/System) with persistent storage.
