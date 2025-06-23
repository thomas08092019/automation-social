"""
RTLS Log Parser
Parses log lines from rtls_data.log into structured data
Expected format: TAG,{tag_id},{cnt},{timestamp}
"""

def parse_log_line(line: str):
    """
    Parse a single log line into structured data
    
    Args:
        line (str): Log line to parse
        
    Returns:
        dict or None: Parsed data or None if invalid
    """
    try:
        if not line or not isinstance(line, str):
            return None
            
        # Remove whitespace and split by comma
        parts = line.strip().split(',')
        
        # Check if we have exactly 4 parts and first part is "TAG"
        if len(parts) != 4 or parts[0] != "TAG":
            return None
            
        # Extract components
        tag_type = parts[0]  # Should be "TAG"
        tag_id = parts[1]
        cnt_str = parts[2]
        timestamp = parts[3]
        
        # Validate tag_id is not empty
        if not tag_id:
            return None
            
        # Convert cnt to integer
        try:
            cnt = int(cnt_str)
        except ValueError:
            return None
              # Validate timestamp format (basic check)
        if len(timestamp) < 10 or '.' not in timestamp:  # Basic format check
            return None
            
        # Return structured data
        return {
            'tag_id': tag_id,
            'cnt': cnt,
            'timestamp': timestamp
        }
        
    except Exception as e:
        print(f"Error parsing line '{line}': {e}")
        return None

def test_parser():
    """Test function for the parser"""
    test_cases = [
        "TAG,fa451f0755d8,197,20240503140059.456",
        "TAG,ab123c4567d8,42,20240503140100.123",
        "INVALID,fa451f0755d8,197,20240503140059.456",  # Invalid type
        "TAG,fa451f0755d8,abc,20240503140059.456",      # Invalid cnt
        "TAG,fa451f0755d8,197",                         # Missing timestamp
        "",                                             # Empty line
        "TAG,,197,20240503140059.456",                  # Empty tag_id
    ]
    
    print("Testing parser with various inputs:")
    for i, test_case in enumerate(test_cases, 1):
        result = parse_log_line(test_case)
        print(f"Test {i}: '{test_case}' -> {result}")

if __name__ == "__main__":
    test_parser()