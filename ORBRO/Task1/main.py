"""
RTLS Main Processing Server
Watches rtls_data.log file for new entries and processes them
Maintains tag state and saves to state.json for API access
"""

import asyncio
import aiofiles
import json
import os
import parser

# Global tag states dictionary
tag_states = {}

# File paths
LOG_FILE = 'rtls_data.log'
STATE_FILE = 'state.json'

async def save_state_to_file():
    """Save current tag states to JSON file for API access"""
    try:
        async with aiofiles.open(STATE_FILE, 'w') as f:
            await f.write(json.dumps(tag_states, indent=2))
    except Exception as e:
        print(f"Error saving state to file: {e}")

async def process_log_entry(log_data: dict):
    """
    Process a single log entry and update tag states
    
    Args:
        log_data (dict): Parsed log data containing tag_id, cnt, timestamp
    """
    tag_id = log_data['tag_id']
    cnt = log_data['cnt']
    timestamp = log_data['timestamp']
    
    # Check if this tag exists in our states
    if tag_id in tag_states:
        # Check if cnt has changed
        if tag_states[tag_id]['last_cnt'] != cnt:
            print(f"INFO: Tag {tag_id} CNT changed from {tag_states[tag_id]['last_cnt']} to {cnt} at {timestamp}")
            tag_states[tag_id]['last_cnt'] = cnt
            tag_states[tag_id]['last_seen'] = timestamp
            # Save updated state
            await save_state_to_file()
        else:
            # Update timestamp even if cnt hasn't changed
            tag_states[tag_id]['last_seen'] = timestamp
    else:
        # New tag discovered
        print(f"INFO: New tag {tag_id} discovered with CNT {cnt} at {timestamp}")
        tag_states[tag_id] = {
            'last_cnt': cnt,
            'last_seen': timestamp
        }
        # Save new state
        await save_state_to_file()

async def watch_log_file(filename: str):
    """
    Watch log file for new entries and process them
    
    Args:
        filename (str): Path to log file to watch
    """
    print(f"Starting to watch log file: {filename}")
    
    # Create log file if it doesn't exist
    if not os.path.exists(filename):
        print(f"Creating log file: {filename}")
        async with aiofiles.open(filename, 'w') as f:
            pass
    
    try:
        async with aiofiles.open(filename, mode='r') as f:
            # Move to end of file to only read new entries
            await f.seek(0, 2)
            print("Watching for new log entries...")
            
            while True:
                # Read new line
                line = await f.readline()
                
                if line:
                    # Parse the log line
                    parsed_data = parser.parse_log_line(line)
                    
                    if parsed_data:
                        await process_log_entry(parsed_data)
                    else:
                        print(f"Warning: Failed to parse log line: {line.strip()}")
                else:
                    # No new data, sleep briefly to avoid busy waiting
                    await asyncio.sleep(0.1)
                    
    except FileNotFoundError:
        print(f"Error: Log file {filename} not found")
    except Exception as e:
        print(f"Error watching log file: {e}")

async def main():
    """Main async function"""
    print("RTLS Main Processing Server Starting...")
    print("Press Ctrl+C to stop")
    
    try:
        await watch_log_file(LOG_FILE)
    except KeyboardInterrupt:
        print("\nMain server stopped by user")
        # Save final state
        await save_state_to_file()
        print("Final state saved")

if __name__ == "__main__":
    asyncio.run(main())