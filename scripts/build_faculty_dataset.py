"""
Build public/data/faculty.json for the website.

Phase 1 (MVP):
- Scrape one WWU directory page that lists faculty/staff
- For each person, attempt to follow profile link (if present)
- Extract department + specialty/research interests (best-effort)
- Write public/data/faculty.json

Phase 2 (next):
- Load salary data from your chosen source
- Fuzzy match salary rows to WWU people
- Add salary fields to the JSON output
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, asdict
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


USER_AGENT = "wwu-salary-site/1.0 (educational project)"
SLEEP_S = 0.6


@dataclass
class FacultyRow:
    name: str
    department: Optional[str] = None
    specialty: Optional[str] = None
    title: Optional[str] = None
    salary: Optional[float] = None
    profile_url: Optional[str] = None


def fetch(url: str, session: requests.Session) -> str:
    time.sleep(SLEEP_S)
    r = session.get(url, timeout=30, headers={"User-Agent": USER_AGENT})
    r.raise_for_status()
    return r.text


def is_wwu(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host.endswith("wwu.edu")


def extract_specialty_from_profile(profile_html: str) -> tuple[Optional[str], Optional[str]]:
    """
    Best-effort extraction: look for headings that imply specialties/interests.
    Returns (department_guess, specialty_text).
    """
    soup = BeautifulSoup(profile_html, "lxml")
    text = soup.get_text(" ", strip=True)

    # Department heuristic: "Department of X"
    dept = None
    m = re.search(r"(Department of|Dept\. of)\s+([A-Z][A-Za-z &\\-]{3,80})", text)
    if m:
        dept = m.group(2).strip()

    # Specialty heuristic: find blocks around common labels
    labels = [
        "Areas of Expertise",
        "Areas of specialty",
        "Areas of Speciality",
        "Specialties",
        "Research Interests",
        "Interests",
        "Expertise",
    ]

    specialty = None
    for lab in labels:
        # find a header containing label
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "strong"]):
            if lab.lower() in tag.get_text(" ", strip=True).lower():
                container = tag.find_parent(["section", "div"]) or tag.parent
                if container:
                    block = container.get_text(" ", strip=True)
                    # strip the label itself if present
                    block = re.sub(lab, "", block, flags=re.IGNORECASE).strip(" :-")
                    if len(block) >= 10:
                        specialty = block[:300]
                        break
        if specialty:
            break

    return dept, specialty


def parse_directory_page(directory_url: str) -> list[FacultyRow]:
    """
    Parser is intentionally generic. We'll tailor once you provide the specific WWU directory pages you want.
    """
    session = requests.Session()
    html = fetch(directory_url, session)
    soup = BeautifulSoup(html, "lxml")

    rows: list[FacultyRow] = []

    # Heuristic: any h2/h3 with a name; sometimes it’s linked to a profile
    for header in soup.select("h2, h3"):
        name = header.get_text(" ", strip=True)
        if not name or len(name) < 4:
            continue

        # attempt to find mailto nearby to validate this is a person block
        block = header.find_parent(["div", "section"]) or header.parent
        mail = block.select_one('a[href^="mailto:"]') if block else None
        if not mail:
            continue

        # title guess: look for next <p>
        title = None
        p = header.find_next("p")
        if p:
            t = p.get_text(" ", strip=True)
            if 2 <= len(t) <= 120:
                title = t

        # profile url: if header is a link
        profile_url = None
        a = header.find("a", href=True)
        if a:
            profile_url = urljoin(directory_url, a["href"])
            if not is_wwu(profile_url):
                profile_url = None

        dept, specialty = (None, None)
        if profile_url:
            try:
                prof_html = fetch(profile_url, session)
                dept, specialty = extract_specialty_from_profile(prof_html)
            except Exception:
                pass

        rows.append(
            FacultyRow(
                name=name,
                department=dept,
                specialty=specialty,
                title=title,
                salary=None,
                profile_url=profile_url,
            )
        )

    # de-dup by (name, profile_url)
    seen = set()
    uniq = []
    for r in rows:
        key = (r.name.lower(), r.profile_url or "")
        if key not in seen:
            seen.add(key)
            uniq.append(r)
    return uniq


def write_json(rows: list[FacultyRow], out_path: str = "public/data/faculty.json") -> None:
    payload = [asdict(r) for r in rows]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(rows)} rows -> {out_path}")


if __name__ == "__main__":
    # TODO: replace with a specific WWU directory page you care about first.
    directory_url = "https://wce.wwu.edu/contact/faculty-staff"
    rows = parse_directory_page(directory_url)
    write_json(rows)
