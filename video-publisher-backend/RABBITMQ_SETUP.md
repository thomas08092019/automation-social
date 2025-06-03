# 🐰 RabbitMQ Setup Guide

## Installation

### Windows (using Docker - Recommended)

```powershell
# Pull RabbitMQ with Management UI
docker pull rabbitmq:3-management

# Run RabbitMQ container
docker run -d --name rabbitmq-video-publisher `
  -p 5672:5672 `
  -p 15672:15672 `
  -e RABBITMQ_DEFAULT_USER=admin `
  -e RABBITMQ_DEFAULT_PASS=password123 `
  rabbitmq:3-management

# Check if running
docker ps
```

### Windows (Direct Installation)

1. Download RabbitMQ from https://www.rabbitmq.com/download.html
2. Install Erlang/OTP first (prerequisite)
3. Install RabbitMQ Server
4. Enable Management Plugin:
   ```cmd
   rabbitmq-plugins enable rabbitmq_management
   ```

### Linux/macOS

```bash
# Ubuntu/Debian
sudo apt-get install rabbitmq-server

# macOS with Homebrew
brew install rabbitmq

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management
```

## Configuration

### 1. Update Environment Variables

Update your `.env` file:

```env
# RabbitMQ Configuration
RABBITMQ_URL="amqp://admin:password123@localhost:5672"
```

### 2. Access Management UI

Open browser and go to: http://localhost:15672
- Username: `admin`
- Password: `password123`

### 3. Create Custom Queues (Optional)

The application will automatically create required queues:
- `video-publish-tasks-queue` - Main processing queue
- `video-publish-tasks-dlq` - Dead letter queue for failed messages
- `video-publish-retry-queue` - Retry queue with delay

## Queue Architecture

```
[Video Upload] → [Publishing Job Created] → [Tasks Added to Queue]
                                               ↓
[RabbitMQ Main Queue] → [Worker Service] → [Platform Upload Services]
                            ↓                        ↓
                      [Success/Retry] ←→ [YouTube/Facebook/Instagram/TikTok]
                            ↓
                    [Update Task Status]
                            ↓
                    [Update Job Status]
```

## Monitoring

### Queue Status API

```bash
GET /publishing/queue/status
```

### RabbitMQ Management UI

Access http://localhost:15672 to monitor:
- Queue depths
- Message rates
- Consumer activity
- Dead letter queue contents

## Production Considerations

### 1. Clustering
```bash
# Set up RabbitMQ cluster for high availability
rabbitmqctl join_cluster rabbit@node1
```

### 2. Persistence
```bash
# Enable queue durability (already configured in code)
# Messages will survive RabbitMQ restarts
```

### 3. Security
```env
# Use strong credentials in production
RABBITMQ_URL="amqp://production_user:secure_password@localhost:5672"
```

### 4. Resource Limits
```bash
# Set memory and disk thresholds
rabbitmqctl set_vm_memory_high_watermark 0.6
```

## Troubleshooting

### Connection Issues
```bash
# Check RabbitMQ status
rabbitmqctl status

# Check logs
docker logs rabbitmq-video-publisher
```

### Queue Issues
```bash
# List all queues
rabbitmqctl list_queues

# Purge a queue (development only)
rabbitmqctl purge_queue video-publish-tasks-queue
```

### Performance Issues
```bash
# Check memory usage
rabbitmqctl status | grep memory

# Monitor message rates
rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## Development vs Production

### Development Setup
- Single RabbitMQ instance
- Default settings
- Management UI enabled
- Local Docker container

### Production Setup
- RabbitMQ cluster (3+ nodes)
- SSL/TLS enabled
- Custom user accounts
- Resource limits configured
- Monitoring with Prometheus/Grafana
- Backup strategy for queue definitions

## Integration Testing

Test your RabbitMQ setup:

```bash
# Create a test video and social accounts first
POST /auth/login
POST /videos (upload a test video)
POST /social-accounts (create test social accounts)

# Then test batch publishing
POST /publishing/batch-jobs
{
  "jobs": [
    {
      "videoId": "your-video-id",
      "targets": [
        { "socialAccountId": "your-social-account-id" }
      ]
    }
  ],
  "batchTitle": "RabbitMQ Test"
}

# Monitor queue status
GET /publishing/queue/status
```

The messages should appear in RabbitMQ and be processed by the worker service.
