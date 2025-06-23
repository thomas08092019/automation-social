"""
BÀI 3: CODE REVIEW ANALYSIS
Analysis of problematic code and proposed improvements for RTLS system
"""

# ORIGINAL PROBLEMATIC CODE
"""
tag_log = []
def log(tag_id, cnt, timestamp):
    tag_log.append((tag_id, cnt, timestamp))
"""

# DETAILED ANALYSIS

class CodeReviewAnalysis:
    """
    Code review analysis for the given tag logging implementation
    """
    
    def __init__(self):
        self.original_code = """
tag_log = []
def log(tag_id, cnt, timestamp):
    tag_log.append((tag_id, cnt, timestamp))
"""
    
    def analyze_problems(self):
        """
        Identify and explain problems in the original code
        """
        problems = {
            "problem_1": {
                "title": "Unbounded Memory Growth",
                "description": """
                The global list 'tag_log' grows indefinitely with each function call.
                On edge devices with limited memory, this will eventually cause:
                - Out of Memory (OOM) errors
                - System crashes
                - Performance degradation
                
                Example: If log() is called once per second for 24 hours:
                - 86,400 entries per day
                - If each entry is ~100 bytes: ~8.6MB per day
                - After 1 month: ~260MB just for log storage
                - This grows without bound!
                """,
                
                "severity": "CRITICAL",
                "impact": "System failure on resource-constrained devices"
            },
            
            "problem_2": {
                "title": "Inefficient Lookup Performance", 
                "description": """
                To find the latest status of a specific tag, you need to:
                1. Iterate through the entire list from end to beginning
                2. Time complexity: O(N) where N is total log entries
                3. As the list grows, queries become slower
                
                Example: Finding latest status of tag 'ABC123':
                - Must scan backwards through all entries
                - If list has 100,000 entries, worst case is 100,000 comparisons
                - This gets exponentially worse over time
                """,
                
                "severity": "HIGH",
                "impact": "Poor performance, slow response times"
            },
            
            "problem_3": {
                "title": "No Data Management",
                "description": """
                The code lacks:
                - Data archival strategy
                - Old data cleanup
                - Memory management
                - Data persistence across restarts
                """,
                
                "severity": "MEDIUM", 
                "impact": "Operational issues, data loss"
            }
        }
        
        return problems
    
    def propose_solutions(self):
        """
        Provide improved solutions addressing the identified problems
        """
        solutions = {
            "solution_1": {
                "title": "Bounded Memory with collections.deque",
                "code": """
from collections import deque

# Limited history - only keep last 1000 entries
tag_log_history = deque(maxlen=1000)

def log_event(tag_id, cnt, timestamp):
    # Automatically removes oldest entry when maxlen reached
    tag_log_history.append((tag_id, cnt, timestamp))
""",
                "benefits": [
                    "Fixed memory usage - maximum 1000 entries",
                    "Automatic cleanup of old data",
                    "O(1) append operation",
                    "Maintains recent history for debugging"
                ]
            },
            
            "solution_2": {
                "title": "Fast Lookup with Dictionary State",
                "code": """
# Current state for O(1) access
tag_current_state = {}

def update_tag_state(tag_id, cnt, timestamp):
    # O(1) lookup and update
    tag_current_state[tag_id] = {
        'cnt': cnt, 
        'timestamp': timestamp,
        'last_updated': time.time()
    }

def get_tag_status(tag_id):
    # O(1) lookup
    return tag_current_state.get(tag_id, None)
""",
                "benefits": [
                    "O(1) lookup time for any tag",
                    "Instant access to current state", 
                    "Scales well with number of tags",
                    "Memory usage proportional to number of tags, not log entries"
                ]
            },
            
            "solution_3": {
                "title": "Combined Approach - Best of Both Worlds",
                "code": """
from collections import deque
import time

class TagManager:
    def __init__(self, history_size=1000):
        # Bounded history for debugging/analysis
        self.tag_history = deque(maxlen=history_size)
        
        # Current state for fast access
        self.current_state = {}
        
        # Statistics
        self.stats = {
            'total_events': 0,
            'unique_tags': 0,
            'start_time': time.time()
        }
    
    def log_event(self, tag_id, cnt, timestamp):
        # Add to bounded history
        event = (tag_id, cnt, timestamp)
        self.tag_history.append(event)
        
        # Update current state (O(1))
        is_new_tag = tag_id not in self.current_state
        self.current_state[tag_id] = {
            'cnt': cnt,
            'timestamp': timestamp,
            'last_seen': time.time()
        }
        
        # Update statistics
        self.stats['total_events'] += 1
        if is_new_tag:
            self.stats['unique_tags'] += 1
    
    def get_tag_status(self, tag_id):
        # O(1) lookup
        return self.current_state.get(tag_id, None)
    
    def get_recent_history(self, limit=100):
        # Get recent history (bounded)
        return list(self.tag_history)[-limit:]
    
    def get_system_stats(self):
        return {
            **self.stats,
            'uptime': time.time() - self.stats['start_time'],
            'memory_usage': len(self.current_state) + len(self.tag_history)
        }

# Usage example
tag_manager = TagManager(history_size=1000)

def log(tag_id, cnt, timestamp):
    tag_manager.log_event(tag_id, cnt, timestamp)
""",
                "benefits": [
                    "Bounded memory usage",
                    "O(1) current state access", 
                    "Maintains debugging history",
                    "Built-in statistics",
                    "Scalable architecture",
                    "Production-ready"
                ]
            }
        }
        
        return solutions
    
    def performance_comparison(self):
        """
        Compare performance metrics between original and improved solutions
        """
        comparison = {
            "memory_usage": {
                "original": "Unbounded - grows linearly with time",
                "improved": "Bounded - fixed maximum based on configuration"
            },
            
            "lookup_time": {
                "original": "O(N) - linear search through all entries", 
                "improved": "O(1) - constant time hash table lookup"
            },
            
            "insert_time": {
                "original": "O(1) - simple append",
                "improved": "O(1) - hash table update + deque append"
            },
            
            "scalability": {
                "original": "Poor - degrades over time",
                "improved": "Excellent - consistent performance"
            },
            
            "edge_device_suitability": {
                "original": "Unsuitable - will crash",
                "improved": "Suitable - predictable resource usage"
            }
        }
        
        return comparison
    
    def implementation_recommendations(self):
        """
        Provide implementation recommendations for production use
        """
        recommendations = [
            {
                "category": "Memory Management",
                "items": [
                    "Use collections.deque with maxlen for bounded history",
                    "Implement periodic cleanup of old state data",
                    "Monitor memory usage and alert on thresholds",
                    "Consider compression for long-term storage"
                ]
            },
            
            {
                "category": "Performance",
                "items": [
                    "Use dictionary for O(1) current state access",
                    "Implement batch processing for high-volume scenarios",
                    "Consider database storage for persistence",
                    "Add indexing for complex queries"
                ]
            },
            
            {
                "category": "Reliability",
                "items": [
                    "Add error handling and validation",
                    "Implement graceful degradation",
                    "Add logging and monitoring",
                    "Design for fault tolerance"
                ]
            },
            
            {
                "category": "Monitoring",
                "items": [
                    "Track memory usage metrics",
                    "Monitor query performance",
                    "Alert on system resource limits",
                    "Implement health checks"
                ]
            }
        ]
        
        return recommendations

def main():
    """
    Main function to demonstrate the code review analysis
    """
    analyzer = CodeReviewAnalysis()
    
    print("=" * 80)
    print("BÀI 3: CODE REVIEW ANALYSIS")
    print("=" * 80)
    
    print("\nORIGINAL PROBLEMATIC CODE:")
    print(analyzer.original_code)
    
    print("\n" + "=" * 50)
    print("PROBLEM ANALYSIS")
    print("=" * 50)
    
    problems = analyzer.analyze_problems()
    for key, problem in problems.items():
        print(f"\n{problem['title']} [{problem['severity']}]")
        print("-" * 40)
        print(problem['description'])
        print(f"Impact: {problem['impact']}")
    
    print("\n" + "=" * 50)
    print("PROPOSED SOLUTIONS")
    print("=" * 50)
    
    solutions = analyzer.propose_solutions()
    for key, solution in solutions.items():
        print(f"\n{solution['title']}")
        print("-" * 40)
        print("Code:")
        print(solution['code'])
        print("\nBenefits:")
        for benefit in solution['benefits']:
            print(f"  • {benefit}")
    
    print("\n" + "=" * 50)
    print("PERFORMANCE COMPARISON")
    print("=" * 50)
    
    comparison = analyzer.performance_comparison()
    for metric, values in comparison.items():
        print(f"\n{metric.replace('_', ' ').title()}:")
        print(f"  Original: {values['original']}")
        print(f"  Improved: {values['improved']}")
    
    print("\n" + "=" * 50)
    print("IMPLEMENTATION RECOMMENDATIONS")
    print("=" * 50)
    
    recommendations = analyzer.implementation_recommendations()
    for rec in recommendations:
        print(f"\n{rec['category']}:")
        for item in rec['items']:
            print(f"  • {item}")
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    print("""
The original code has critical flaws that make it unsuitable for production use,
especially on edge devices with limited resources. The proposed solutions address
these issues while maintaining simplicity and adding useful features.

Key takeaways:
1. Always consider memory constraints in embedded/edge systems
2. Choose appropriate data structures for your access patterns
3. Design with scalability and monitoring in mind
4. Test with realistic data volumes and time periods
""")

if __name__ == "__main__":
    main()
