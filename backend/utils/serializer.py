from datetime import date, datetime, timedelta
from decimal import Decimal
import json

def json_default_serializer(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        # Convert to float or int
        return float(obj) if '.' in str(obj) else int(obj)
    if isinstance(obj, timedelta):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    raise TypeError(f"Type {type(obj)} not serializable")

def serialize_data(data):
    """Deep convert any Decimal or date objects in data to JSON-safe primitives."""
    return json.loads(json.dumps(data, default=json_default_serializer))
