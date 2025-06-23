# RTLS Backend System

## Overview
Real-Time Location System (RTLS) backend implementation for tag tracking and management. This system processes tag location data in real-time and provides REST API endpoints for tag registration and status queries.

## Assignment Structure

This project implements a complete RTLS backend system covering multiple assignment requirements:

### **Bài 1 (Task 1): Log Processing and State Management**
- **Files**: `tag_simulator.py`, `parser.py`, `main.py`
- **Objectives**:
  - Simulate RTLS tag data and write to log file
  - Parse log lines with proper validation
  - Watch log file in real-time and maintain tag states
  - Save current states to JSON file
- **Implementation**: Real-time log monitoring with asynchronous file watching

### **Bài 2 (Task 2): REST API Development**
- **Files**: `api.py`
- **Objectives**:
  - Provide REST API endpoints for tag management
  - Support tag registration and status queries
  - Implement proper HTTP status codes and error handling
  - Include API documentation and health checks
- **Implementation**: FastAPI-based REST server with comprehensive endpoints

### **Bài 3 (Task 3): Code Review and Analysis**
- **Files**: `code_review.py`
- **Objectives**:
  - Analyze problematic code for memory and performance issues
  - Identify critical flaws in unbounded memory growth
  - Propose improved solutions with bounded memory usage
  - Provide performance comparison and recommendations
- **Implementation**: Comprehensive code analysis with practical solutions

### **Bài Tự Chọn (Optional Task): Database Integration**
- **Files**: `db.py`
- **Objectives**:
  - Implement SQLite database operations for persistent storage
  - Provide both class-based and function-based database interfaces
  - Support tag registration and status tracking in database
  - Enable production-ready data persistence
- **Implementation**: Complete SQLite integration with proper schema design

## Architecture
- **tag_simulator.py**: Simulates RTLS tags generating location data (Bài 1)
- **parser.py**: Log parser module for data extraction (Bài 1)
- **main.py**: Main processing server that watches log files and maintains tag states (Bài 1)
- **api.py**: REST API server for tag management and queries (Bài 2)
- **code_review.py**: Code review analysis and improved solutions (Bài 3)
- **db.py**: Database module for SQLite operations (Bài Tự Chọn)

## Data Flow
```
Tag Simulator → rtls_data.log → Main Server → state.json ← API Server ← Client
                                     ↓
                              SQLite Database (Optional)
```

## Environment Setup and Execution Method

### Prerequisites
- Python 3.9 or higher
- Windows 10/11 or Linux/macOS

### Installation Steps

1. **Create and activate virtual environment:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Activate virtual environment (Linux/macOS)
source venv/bin/activate
```

2. **Install required packages:**
```bash
pip install -r requirements.txt
```

### Running the System

The system requires **3 separate terminal sessions** running simultaneously:

#### Terminal 1: Main Processing Server
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# Run main server
python main.py
```
Expected output: `RTLS Main Processing Server Starting...`

#### Terminal 2: Tag Simulator
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# Run tag simulator
python tag_simulator.py
```
Expected output: `Starting RTLS Tag Simulator...`

#### Terminal 3: API Server
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# Run API server
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
Expected output: `Uvicorn running on http://0.0.0.0:8000`

## Tag Simulation Method Explanation

### How Tag Simulation Works (Bài 1 Implementation)

The RTLS system uses `tag_simulator.py` to simulate real-world RTLS tag behavior:

#### **Simulation Parameters:**
- **Tag Count**: Configurable number of active tags (default: 5 tags)
- **Update Frequency**: Each tag sends data every 1-2 seconds (randomized)
- **Data Format**: `TAGID,CNT,TIMESTAMP` (comma-separated values)
- **Counter Behavior**: Incremental counter with occasional resets (simulating real hardware)
- **Coordinate System**: Random X,Y coordinates within defined boundaries

#### **Realistic Tag Behavior Simulation:**
1. **Power Cycling**: Tags occasionally reset their counters (simulating battery replacement)
2. **Variable Timing**: Random intervals between transmissions (simulating real RF conditions)
3. **Unique Identifiers**: Each tag has a unique hex ID (12 characters)
4. **Continuous Operation**: Tags run indefinitely until manually stopped

#### **Data Generation Process:**
1. **Tag Simulator** generates log entries for multiple predefined tags:
   - `fa451f0755d8` (Worker A Helmet)
   - `ab123c4567d8` (Worker B Safety Vest)
   - `de678f1234e9` (Equipment Forklift)

2. **Log Format**: `TAG,{tag_id},{cnt},{timestamp}`
   - Example: `TAG,fa451f0755d8,197,20240503140059.456`

3. **File-based Communication**:
   - Simulator writes to `rtls_data.log`
   - Main server monitors this file for new entries
   - Data is processed in real-time using async file watching

4. **State Management**:
   - Main server maintains tag states in memory
   - States are saved to `state.json` for API access
   - Counter changes trigger log messages

#### **Key Features:**
- **Real-time Processing**: Uses asyncio and aiofiles for efficient file monitoring
- **State Persistence**: Tag states saved to JSON files for cross-process communication
- **Error Handling**: Robust parsing and validation of log entries
- **Scalable Design**: Can easily extend to support more tags

#### **Starting the Simulation:**
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/macOS

# Run tag simulator (generates continuous data)
python tag_simulator.py

# Output: Creates rtls_data.log with real-time tag data
# Each line represents one tag transmission
# File grows continuously as tags transmit data
```

## API Testing Examples (Bài 2 Implementation)

### Health Check
```bash
curl -X GET http://localhost:8000/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-05-03T14:00:59.456789"
}
```

### Register a Tag
```bash
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{"id": "fa451f0755d8", "description": "Helmet Tag for Worker A"}'
```
Expected response:
```json
{
  "message": "Tag fa451f0755d8 registered successfully",
  "tag": {
    "id": "fa451f0755d8",
    "description": "Helmet Tag for Worker A",
    "registered_at": "2024-05-03T14:00:59.456789"
  }
}
```

### Get All Tags
```bash
curl -X GET http://localhost:8000/tags
```
Expected response:
```json
[
  {
    "id": "fa451f0755d8",
    "description": "Helmet Tag for Worker A",
    "last_cnt": 197,
    "last_seen": "20240503140059.456"
  }
]
```

### Get Specific Tag Details
```bash
curl -X GET http://localhost:8000/tag/fa451f0755d8
```
Expected response:
```json
{
  "tag": {
    "id": "fa451f0755d8",
    "description": "Helmet Tag for Worker A",
    "last_cnt": 197,
    "last_seen": "20240503140059.456"
  },
  "registered_at": "2024-05-03T14:00:59.456789",
  "is_active": true
}
```

### API Documentation
Access interactive API documentation at: http://localhost:8000/docs

## API Testing Examples (Bài 2 Implementation)

### Comprehensive API Testing with curl Commands

#### 1. Test Health Check
```bash
# Check if API server is running
curl -X GET http://localhost:8000/health

# Expected response:
# {"status": "healthy", "timestamp": "2024-05-03T14:00:59", "version": "1.0.0"}
```

#### 2. Register Multiple Tags
```bash
# Register first tag
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "fa451f0755d8",
    "description": "Helmet Tag for Worker A"
  }'

# Register second tag
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "b8c3f2e1a5d9",
    "description": "Safety Vest Tag for Worker B"
  }'

# Register third tag
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "e7f9a1b2c3d4",
    "description": "Equipment Tag for Forklift"
  }'
```

#### 3. Query All Tags
```bash
# Get all registered tags
curl -X GET http://localhost:8000/tags

# Expected response format:
# [
#   {
#     "id": "fa451f0755d8",
#     "description": "Helmet Tag for Worker A",
#     "last_cnt": 142,
#     "last_seen": "20240503140059.456",
#     "is_active": true
#   },
#   {
#     "id": "b8c3f2e1a5d9", 
#     "description": "Safety Vest Tag for Worker B",
#     "last_cnt": 89,
#     "last_seen": "20240503140101.234",
#     "is_active": true
#   }
# ]
```

#### 4. Query Specific Tag Details
```bash
# Get details for specific tag
curl -X GET http://localhost:8000/tag/fa451f0755d8

# Get another tag
curl -X GET http://localhost:8000/tag/b8c3f2e1a5d9

# Try querying non-existent tag (should return 404)
curl -X GET http://localhost:8000/tag/nonexistent123
```

#### 5. Advanced Testing with Parameters
```bash
# Test with verbose output
curl -v -X GET http://localhost:8000/tags

# Test with timing information
curl -w "@curl-format.txt" -X GET http://localhost:8000/health

# Test response headers
curl -I -X GET http://localhost:8000/tags
```

#### 6. Load Testing Example
```bash
# Simple load test - register 10 tags quickly
for i in {1..10}; do
  curl -X POST http://localhost:8000/tags \
    -H "Content-Type: application/json" \
    -d "{\"tag_id\": \"test_tag_$i\", \"description\": \"Test Tag $i\"}" &
done
wait

# Query all tags after load test
curl -X GET http://localhost:8000/tags
```

#### 7. Error Handling Tests
```bash
# Test duplicate tag registration (should return conflict)
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "fa451f0755d8",
    "description": "Duplicate Tag"
  }'

# Test invalid JSON format
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "invalid_json"'

# Test missing required fields
curl -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Missing tag_id field"
  }'
```

#### 8. Testing Complete Workflow
```bash
# Complete test sequence
echo "=== RTLS API Testing Sequence ==="

echo "1. Health check..."
curl -s http://localhost:8000/health | jq '.'

echo -e "\n2. Register test tag..."
curl -s -X POST http://localhost:8000/tags \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "test001", "description": "Test Tag 001"}' | jq '.'

echo -e "\n3. Wait for tag data (10 seconds)..."
sleep 10

echo -e "\n4. Query tag status..."
curl -s http://localhost:8000/tag/test001 | jq '.'

echo -e "\n5. List all tags..."
curl -s http://localhost:8000/tags | jq '.'

echo -e "\n=== Test Complete ==="
```

#### 9. PowerShell Testing (Windows)
```powershell
# For Windows users using PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET

# Register tag using PowerShell
$body = @{
    tag_id = "ps_test_001"
    description = "PowerShell Test Tag"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/tags" -Method POST -Body $body -ContentType "application/json"

# Query tags
Invoke-RestMethod -Uri "http://localhost:8000/tags" -Method GET
```

### Testing Tools Setup

#### Install jq for JSON parsing (Optional but recommended)
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (using chocolatey)
choco install jq
```

#### Create curl format file for timing (Optional)
```bash
# Create curl-format.txt for detailed timing
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## Optional Database Integration (Bài Tự Chọn Implementation)

For production use, the system includes SQLite database support:

### Database Setup
```bash
# Test database operations
python db.py
```

### Using Database Mode
The `db.py` module provides:
- `init_db()`: Initialize database tables
- `register_tag()`: Register new tags
- `update_tag_location()`: Update tag status
- `get_all_tags_with_status()`: Query all tags
- `get_tag_with_status()`: Query specific tag

## Testing the Complete System

1. **Start all three components** in order (main.py, tag_simulator.py, api.py)
2. **Register tags** using POST /tags endpoint
3. **Observe real-time processing** in main.py terminal
4. **Check tag status** using GET /tags endpoint
5. **Verify data flow** by checking log files and API responses

## Troubleshooting

### Common Issues
- **Port already in use**: Change port in api.py or kill existing process
- **Permission denied**: Ensure write access to project directory
- **Module not found**: Activate virtual environment and install requirements

### Log Files
- `rtls_data.log`: Raw tag data from simulator
- `state.json`: Current tag states (auto-generated)
- `registered_tags.json`: Registered tag information (auto-generated)

## Project Structure
```
Task1/
├── main.py              # Main processing server (Bài 1)
├── parser.py            # Log parser module (Bài 1)
├── tag_simulator.py     # Tag data simulator (Bài 1)
├── api.py               # REST API server (Bài 2)
├── code_review.py       # Code review analysis (Bài 3)
├── db.py                # Database operations (Bài Tự Chọn)
├── requirements.txt     # Python dependencies
├── README.md            # This documentation
└── .gitignore          # Git ignore patterns
```

## Code Review Analysis (Bài 3 Implementation)

### Running the Code Review Analysis

To execute the comprehensive code review analysis:

```bash
# Run the code review analysis
python code_review.py

# This will output detailed analysis of the problematic code
# including problem identification, solutions, and recommendations
```

### Problem Analysis: Unbounded Memory Growth

**Original Problematic Code:**
```python
tag_log = []
def log(tag_id, cnt, timestamp):
    tag_log.append((tag_id, cnt, timestamp))
```

**Critical Issues Identified:**

1. **Memory Leak**: List grows indefinitely, causing Out of Memory on edge devices
2. **Poor Performance**: O(N) lookup time for latest tag status  
3. **No Data Management**: Lacks archival strategy and cleanup mechanisms
4. **Production Unsuitability**: Will crash on resource-constrained devices

**Improved Solution:**
```python
from collections import deque

# Limited history with O(1) append
tag_log_history = deque(maxlen=1000)

# O(1) lookup for current state
tag_current_state = {}

def log_event(tag_id, cnt, timestamp):
    # Store in limited history
    tag_log_history.append((tag_id, cnt, timestamp))
    
    # Update current state for fast access
    tag_current_state[tag_id] = {'cnt': cnt, 'timestamp': timestamp}
```

**Benefits of Improved Solution:**
- **Memory Bounded**: Maximum 1000 entries in history
- **Fast Access**: O(1) lookup for current tag state
- **Balanced Approach**: Maintains recent history while preventing memory issues
- **Production Ready**: Suitable for edge devices with limited resources

### Detailed Analysis Available

The `code_review.py` file contains:
- **Comprehensive Problem Analysis**: Detailed examination of memory and performance issues
- **Multiple Solution Approaches**: From simple fixes to advanced implementations
- **Performance Comparisons**: Benchmarking original vs improved solutions
- **Implementation Recommendations**: Production-ready best practices
- **Edge Device Considerations**: Specific optimizations for resource-constrained environments

### Key Recommendations

1. **Use Bounded Data Structures**: Implement `collections.deque` with `maxlen`
2. **Separate Current State**: Maintain fast O(1) lookup dictionary
3. **Implement Monitoring**: Track memory usage and performance metrics
4. **Design for Scale**: Consider database storage for large deployments
5. **Add Error Handling**: Implement robust exception handling and logging
