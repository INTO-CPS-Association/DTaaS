import platform 
import os
from pathlib import Path
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Tuple

class ServicesConfig:
    def find_os_type():
        os_type = platform.system()
        if os_type:
            return os_type.lower()
        raise RuntimeError("Unable to determine operating system type.")


