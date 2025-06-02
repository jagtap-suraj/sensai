# SensAI - AI-Powered Interview Practice Platform

SensAI is a comprehensive interview preparation platform that helps users practice and improve their interviewing skills through AI-powered mock interviews. The platform leverages Google's Gemini AI to conduct realistic interview simulations, provide real-time feedback, and help users prepare for job interviews across various roles and industries.

![SensAI Dashboard](/public/dashboard_screenshot.jpeg)

## Features

- **Live AI Interviews**: Conduct real-time audio interviews with Gemini AI that adapts to your responses
- **Multiple Interview Types**: Practice technical, behavioral, or mixed interviews based on your needs
- **Customizable Experience**: Select your target role, job level, and interview type to tailor the experience
- **Resume Analysis**: Upload your resume to personalize interview questions
- **Real-time Audio Visualization**: Visual feedback while you speak
- **Comprehensive Feedback**: Receive detailed feedback and improvement suggestions after each interview
- **Interview Transcript**: Review full interview transcripts to analyze your responses
- **User Profiles**: Track your progress and history across multiple interviews
- **Industry Insights**: Get up-to-date information on job market trends, salary ranges, and in-demand skills

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Clerk
- **AI Integration**: Google Gemini AI (via Google GenAI API)
- **Audio Processing**: Web Audio API with AudioWorklet
- **UI Components**: Radix UI primitives with custom styling
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database
- Clerk account for authentication
- Google Gemini API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/sensai.git
   cd sensai
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:

   ```
   # Database
   DATABASE_URL=your_database_connection_url_here

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

   # Advicement API key
   ADVICEMENT_API_KEY=your_advicement_api_key_here
   ```

4. Run database migrations:

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. Start the development server:

   ```bash
   pnpm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Interview Flow

1. **Setup**: Choose your target role, job level, and interview type
2. **Prepare**: Optionally upload your resume for a more tailored experience
3. **Interview**: Engage in a real-time audio conversation with the AI interviewer
4. **Feedback**: Receive comprehensive feedback on your performance
5. **Review**: Analyze the interview transcript and improvement suggestions

## Key Components

- **Live Interview**: Real-time audio interview with AI, including speech processing and visual feedback
- **Resume Management**: Upload and manage resumes to personalize your interview experience
- **Assessment Tools**: Track your progress and identify areas for improvement
- **Cover Letter Generation**: Create tailored cover letters based on your profile and target roles
- **Industry Insights**: Access data on job market trends, salary ranges, and in-demand skills

## Project Structure

- `/src/app`: Next.js application routes using the App Router
- `/src/components`: Reusable UI components
- `/src/lib`: Utility functions, actions, and business logic
- `/src/hooks`: Custom React hooks for application logic
- `/src/types`: TypeScript type definitions
- `/prisma`: Database schema and migrations

## Audio Processing

The application uses the Web Audio API with AudioWorklet for real-time audio processing:

1. The user's microphone input is captured using `getUserMedia`
2. Audio data is processed through a custom PCM processor worklet
3. Processed audio is sent to the Gemini API in real-time
4. Responses from the API are played back to the user

## Database Schema

The PostgreSQL database includes models for:

- Users and authentication
- Interviews and transcripts
- Resumes and personal information
- Industry insights and feedback
- Cover letters and job applications

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [RoadsideCoder](https://www.youtube.com/@RoadsideCoder)
- [Next.js](https://nextjs.org/)
- [Prisma](https://prisma.io/)
- [Clerk](https://clerk.dev/)
- [Google Gemini AI](https://ai.google.dev/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Advicement](https://advicement.io/)
