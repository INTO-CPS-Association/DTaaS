#!/usr/bin/env python3
"""Back up selected DTaaS platform services. Linux, macOS and Windows; Python >= 3.10, stdlib only.

  python backup.py estimate --services <list|all>
  python backup.py backup   --services <list|all> --target-host <host> [--source-host <host>]
                            [--stop-tb] [--mongo-gzip] [--mongo-db DB] [--influx-bucket ORG/BUCKET]
  python backup.py verify   <backup-dir>

Services: postgres thingsboard grafana influxdb mongodb rabbitmq (or: all).
Env overrides: BACKUP_ROOT, <SERVICE>_CONTAINER (e.g. MONGODB_CONTAINER).
"""
import os
import sys

if sys.version_info < (3, 10):
    sys.exit("ERROR: Python 3.10 or newer is required (use the dtaas-services venv's python)")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dtaas_backup.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
