"""
denver_calculator.py  —  thin re-export of the repo's core calculator.

The Denver build plan referred to a `denver_calculator.py` at the repo root. In this product the
canonical, validated underwriting math lives in the generic, reusable `calculator.py` at the product
root (`rent-covers-mortgage/calculator.py`). This shim simply re-exports it under the name the Denver
pipeline imports (`denver_model.py` / `apify_ingest.py` use `import denver_calculator as dc`), so there
is ONE source of truth for the 35-year net-worth math — and the §1 insurance patch lives there, applied
once, for every consumer.
"""
import os
import sys
from pathlib import Path

# product root = rent-covers-mortgage/ (two levels up from this file: examples/denver/ -> examples/ -> root)
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from calculator import *  # noqa: F401,F403  (re-export every validated function/constant)
import calculator as _calc

# Make `from calculator import *` reflect the real module's public names exactly.
__all__ = [n for n in dir(_calc) if not n.startswith('_')]
