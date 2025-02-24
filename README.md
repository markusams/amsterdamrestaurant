# Amsterdam Restaurant Guide

An AI-powered restaurant guide for Amsterdam, helping you discover the perfect dining spots across the city. Get personalized restaurant recommendations with detailed information, including addresses that are automatically detected and displayed on an interactive map.

## Features
- Smart restaurant recommendations based on your preferences
- Automatic address detection and map visualization
- Real-time chat interface with AI
- Personalized dining suggestions
- Interactive Google Maps integration

## Technologies used
- React with Next.js 14 App Router
- TailwindCSS
- OpenAI API for intelligent restaurant recommendations
- Google Maps API for location visualization
- Vercel AI SDK for streaming responses

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start exploring Amsterdam's restaurants.

## Environment Variables

To run this project, you need to add the following environment variables to your `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```