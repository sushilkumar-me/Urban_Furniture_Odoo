"""
Root convenience wrapper for running seed_data.py from the project root.
Delegates directly to backend/seed_data.py.
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import seed_data

if __name__ == "__main__":
    seed_data.main()
