"""
Database Module - SQLite integration for RTLS system
Provides persistent storage for tag registration and location data
"""

import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import os


# Configuration
DB_FILE = "rtls_system.db"

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RTLSDatabase:
    """RTLS Database management class"""
    
    def __init__(self, db_file: str = DB_FILE):
        """
        Initialize database connection
        
        Args:
            db_file (str): Path to SQLite database file
        """
        self.db_file = db_file
        self.init_db()
    
    def get_connection(self) -> sqlite3.Connection:
        """
        Get database connection with row factory
        
        Returns:
            sqlite3.Connection: Database connection
        """
        try:
            conn = sqlite3.connect(self.db_file)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            return conn
        except sqlite3.Error as e:
            logger.error(f"Database connection error: {e}")
            raise
    
    def init_db(self):
        """Initialize database tables"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Create tags table for registration
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY,
                    description TEXT,
                    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create tag_locations table for location history
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tag_locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tag_id TEXT NOT NULL,
                    cnt INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(tag_id) REFERENCES tags(id)
                )
            """)
            
            # Create indexes for performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tag_locations_tag_id 
                ON tag_locations(tag_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tag_locations_timestamp 
                ON tag_locations(timestamp)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tag_locations_tag_timestamp 
                ON tag_locations(tag_id, timestamp)
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
            
        except sqlite3.Error as e:
            logger.error(f"Database initialization error: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def register_tag(self, tag_id: str, description: str = "") -> bool:
        """
        Register a new tag or update existing one
        
        Args:
            tag_id (str): Unique tag identifier
            description (str): Tag description
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not tag_id:
                logger.error("Tag ID cannot be empty")
                return False
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Use INSERT OR REPLACE to handle both new and existing tags
            cursor.execute("""
                INSERT OR REPLACE INTO tags (id, description, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (tag_id, description))
            
            conn.commit()
            logger.info(f"Tag {tag_id} registered/updated successfully")
            return True
            
        except sqlite3.Error as e:
            logger.error(f"Error registering tag {tag_id}: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()
    
    def update_tag_location(self, tag_id: str, cnt: int, timestamp: str) -> bool:
        """
        Update tag location data
        
        Args:
            tag_id (str): Tag identifier
            cnt (int): Counter value
            timestamp (str): Timestamp string
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Check if tag is registered, if not, auto-register
            cursor.execute("SELECT id FROM tags WHERE id = ?", (tag_id,))
            if not cursor.fetchone():
                logger.info(f"Auto-registering tag {tag_id}")
                cursor.execute("""
                    INSERT INTO tags (id, description, registered_at, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (tag_id, f"Auto-registered tag {tag_id}"))
            
            # Insert location data
            cursor.execute("""
                INSERT INTO tag_locations (tag_id, cnt, timestamp)
                VALUES (?, ?, ?)
            """, (tag_id, cnt, timestamp))
            
            conn.commit()
            logger.debug(f"Location updated for tag {tag_id}: cnt={cnt}, timestamp={timestamp}")
            return True
            
        except sqlite3.Error as e:
            logger.error(f"Error updating location for tag {tag_id}: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()
    
    def get_all_tags_with_status(self) -> List[Dict]:
        """
        Get all registered tags with their latest status
        
        Returns:
            List[Dict]: List of tags with status information
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Complex query to get latest status for each tag
            query = """
                SELECT 
                    t.id,
                    t.description,
                    t.registered_at,
                    t.updated_at,
                    l.cnt as last_cnt,
                    l.timestamp as last_seen
                FROM tags t
                LEFT JOIN (
                    SELECT 
                        tag_id,
                        cnt,
                        timestamp,
                        ROW_NUMBER() OVER (PARTITION BY tag_id ORDER BY timestamp DESC, id DESC) as rn
                    FROM tag_locations
                ) l ON t.id = l.tag_id AND l.rn = 1
                ORDER BY t.id
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            tags = []
            for row in rows:
                tag_info = {
                    'id': row['id'],
                    'description': row['description'] or '',
                    'registered_at': row['registered_at'],
                    'updated_at': row['updated_at'],
                    'last_cnt': row['last_cnt'],
                    'last_seen': row['last_seen']
                }
                tags.append(tag_info)
            
            return tags
            
        except sqlite3.Error as e:
            logger.error(f"Error getting all tags: {e}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_tag_with_status(self, tag_id: str) -> Optional[Dict]:
        """
        Get specific tag with its latest status
        
        Args:
            tag_id (str): Tag identifier
        
        Returns:
            Optional[Dict]: Tag information or None if not found
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Get tag info
            cursor.execute("""
                SELECT id, description, registered_at, updated_at 
                FROM tags 
                WHERE id = ?
            """, (tag_id,))
            
            tag_row = cursor.fetchone()
            if not tag_row:
                return None
            
            # Get latest location
            cursor.execute("""
                SELECT cnt, timestamp
                FROM tag_locations
                WHERE tag_id = ?
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
            """, (tag_id,))
            
            location_row = cursor.fetchone()
            
            # Build result
            tag_info = {
                'id': tag_row['id'],
                'description': tag_row['description'] or '',
                'registered_at': tag_row['registered_at'],
                'updated_at': tag_row['updated_at'],
                'last_cnt': location_row['cnt'] if location_row else None,
                'last_seen': location_row['timestamp'] if location_row else None
            }
            
            return tag_info
            
        except sqlite3.Error as e:
            logger.error(f"Error getting tag {tag_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()
    
    def get_tag_history(self, tag_id: str, limit: int = 100) -> List[Dict]:
        """
        Get location history for a specific tag
        
        Args:
            tag_id (str): Tag identifier
            limit (int): Maximum number of records to return
        
        Returns:
            List[Dict]: List of location records
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT cnt, timestamp, processed_at
                FROM tag_locations
                WHERE tag_id = ?
                ORDER BY timestamp DESC, id DESC
                LIMIT ?
            """, (tag_id, limit))
            
            rows = cursor.fetchall()
            
            history = []
            for row in rows:
                history.append({
                    'cnt': row['cnt'],
                    'timestamp': row['timestamp'],
                    'processed_at': row['processed_at']
                })
            
            return history
            
        except sqlite3.Error as e:
            logger.error(f"Error getting history for tag {tag_id}: {e}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_statistics(self) -> Dict:
        """
        Get system statistics
        
        Returns:
            Dict: System statistics
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Get total tags
            cursor.execute("SELECT COUNT(*) as count FROM tags")
            total_tags = cursor.fetchone()['count']
            
            # Get total location records
            cursor.execute("SELECT COUNT(*) as count FROM tag_locations")
            total_locations = cursor.fetchone()['count']
            
            # Get active tags (tags with location data)
            cursor.execute("""
                SELECT COUNT(DISTINCT tag_id) as count 
                FROM tag_locations
            """)
            active_tags = cursor.fetchone()['count']
            
            # Get latest activity
            cursor.execute("""
                SELECT MAX(processed_at) as latest_activity
                FROM tag_locations
            """)
            latest_activity = cursor.fetchone()['latest_activity']
            
            return {
                'total_tags': total_tags,
                'active_tags': active_tags,
                'total_location_records': total_locations,
                'latest_activity': latest_activity,
                'database_file': self.db_file,
                'database_size_bytes': os.path.getsize(self.db_file) if os.path.exists(self.db_file) else 0
            }
            
        except sqlite3.Error as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
        finally:
            if conn:
                conn.close()
    
    def cleanup_old_data(self, days_to_keep: int = 30) -> int:
        """
        Cleanup old location data
        
        Args:
            days_to_keep (int): Number of days of data to keep
        
        Returns:
            int: Number of records deleted
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Delete old location records
            cursor.execute("""
                DELETE FROM tag_locations 
                WHERE processed_at < datetime('now', '-{} days')
            """.format(days_to_keep))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"Cleaned up {deleted_count} old location records")
            return deleted_count
            
        except sqlite3.Error as e:
            logger.error(f"Error cleaning up old data: {e}")
            return 0
        finally:
            if conn:
                conn.close()


# Global database instance
db_instance = RTLSDatabase()


# Convenience functions for backward compatibility
def init_db():
    """Initialize database"""
    db_instance.init_db()


def register_tag(tag_id: str, description: str = "") -> bool:
    """Register a tag"""
    return db_instance.register_tag(tag_id, description)


def update_tag_location(tag_id: str, cnt: int, timestamp: str) -> bool:
    """Update tag location"""
    return db_instance.update_tag_location(tag_id, cnt, timestamp)


def get_all_tags_with_status() -> List[Dict]:
    """Get all tags with status"""
    return db_instance.get_all_tags_with_status()


def get_tag_with_status(tag_id: str) -> Optional[Dict]:
    """Get tag with status"""
    return db_instance.get_tag_with_status(tag_id)


def get_tag_history(tag_id: str, limit: int = 100) -> List[Dict]:
    """Get tag history"""
    return db_instance.get_tag_history(tag_id, limit)


def get_statistics() -> Dict:
    """Get system statistics"""
    return db_instance.get_statistics()


if __name__ == "__main__":
    # Test database functionality
    print("Testing RTLS Database Module")
    print("=" * 40)
    
    # Initialize database
    print("\n1. Initializing database...")
    init_db()
    
    # Test tag registration
    print("\n2. Testing tag registration...")
    register_tag("test_tag_001", "Test Tag #1")
    register_tag("test_tag_002", "Test Tag #2")
    
    # Test location updates
    print("\n3. Testing location updates...")
    update_tag_location("test_tag_001", 100, "20240503140059.456")
    update_tag_location("test_tag_001", 101, "20240503140159.456")
    update_tag_location("test_tag_002", 50, "20240503140259.456")
    
    # Test queries
    print("\n4. Testing queries...")
    all_tags = get_all_tags_with_status()
    print(f"All tags: {len(all_tags)}")
    for tag in all_tags:
        print(f"  {tag}")
    
    print("\n5. Testing specific tag query...")
    tag_details = get_tag_with_status("test_tag_001")
    print(f"Tag details: {tag_details}")
    
    print("\n6. Testing tag history...")
    history = get_tag_history("test_tag_001")
    print(f"Tag history: {len(history)} records")
    for record in history:
        print(f"  {record}")
    
    print("\n7. Testing statistics...")
    stats = get_statistics()
    print(f"System statistics: {stats}")
    
    print("\nDatabase testing completed successfully!")
