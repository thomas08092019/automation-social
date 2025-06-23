"""
RTLS Tag Simulator
Generates log data for RTLS tags and writes to rtls_data.log
Format: TAG,{tag_id},{cnt},{timestamp}
"""

import time
import datetime
import random

# List of Tag IDs to simulate
TAG_IDS = ["fa451f0755d8", "ab123c4567d8", "de678f1234e9"]

def main():
    """Main function to simulate tag data generation"""
    # Initialize counter for each tag
    tag_counters = {tag_id: 0 for tag_id in TAG_IDS}
    
    print("Starting RTLS Tag Simulator...")
    print(f"Simulating {len(TAG_IDS)} tags: {TAG_IDS}")
    print("Writing data to rtls_data.log")
    print("Press Ctrl+C to stop")
    
    try:
        with open('rtls_data.log', 'a', encoding='utf-8') as file:
            while True:
                # Randomly select a tag
                tag_id = random.choice(TAG_IDS)
                
                # Increment counter for this tag
                tag_counters[tag_id] += 1
                cnt = tag_counters[tag_id]
                
                # Generate timestamp in format YYYYMMDDHHMMSS.fff
                timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S.%f')[:-3]
                
                # Create log line
                log_line = f"TAG,{tag_id},{cnt},{timestamp}\n"
                
                # Write to file and flush immediately
                file.write(log_line)
                file.flush()
                
                # Print to console for monitoring
                print(f"Generated: {log_line.strip()}")
                
                # Wait before next generation
                time.sleep(0.5)
                
    except KeyboardInterrupt:
        print("\nTag Simulator stopped by user")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()