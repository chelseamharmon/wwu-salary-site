from dataclasses import dataclass
from typing import Optional

@dataclass
class SalaryRow:
    name: str
    year: int
    salary: Optional[float]
    job_title: Optional[str]
    source: str
