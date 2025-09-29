# Hedera Consensus Service (HCS) Server

This server provides an API endpoint for publishing messages to Hedera Consensus Service topics.

## Setup

1. Create a `.env` file in the server directory with the following variables:

```
# Hedera Configuration
OPERATOR_ID=your_operator_id_here
OPERATOR_KEY=your_operator_key_here
SOURCE_TOPIC_ID=your_source_topic_id_here
TARGET_TOPIC_ID=your_target_topic_id_here

# Server Configuration
PORT=5174
START_SUBSCRIBER=false
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run server
```

## API Endpoints

### POST /api/hcs/publish

Publishes a message to the Hedera Consensus Service topic.

**Request Body:**
```json
{
  "email": "user@example.com",
  "message": "Your message here",
  "eventId": "unique-event-id"
}
```

**Response:**
```json
{
  "status": "success"
}
```

## Features

- **Publisher**: Publishes messages to the source topic
- **Subscriber**: Listens to the source topic and forwards messages to the target topic
- **Forwarder**: Handles message forwarding between topics

## Usage

The server is designed to work with the React frontend. When a user clicks "Send Request" in the alerts section, it will send a POST request to `/api/hcs/publish` with the alert details.
